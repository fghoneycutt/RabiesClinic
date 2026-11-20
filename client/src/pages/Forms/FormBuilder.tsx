import { useEffect, useState, type DragEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Row,
  Spinner,
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowDown,
  faArrowUp,
  faChevronDown,
  faChevronRight,
  faCircleInfo,
  faGripVertical,
  faSave,
  faList,
  faPlus,
  faPaw,
  faTrash,
  faUser,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '../../api/api';

type QuestionType =
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'radio'
  | 'checkbox'
  | 'dropdown'
  | 'yes_no'
  | 'date'
  | 'file_upload'
  | 'content'
  | 'owner_information'
  | 'animal_information'
  | 'signature';

interface Condition {
  questionId: string;
  operator: 'equals' | 'not_equals';
  values: string[];
}

interface Question {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  staffOnly: boolean;
  options: string[];
  condition?: Condition;

  animalCountSource?: 'fixed' | 'question';
  animalCountQuestionId?: string;
  fileAccept?: string;
  allowMultipleFiles?: boolean;
}

interface Section {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  condition?: Condition;
}

interface QuestionGroup {
  sectionId: string;
  sectionTitle: string;
  questions: Question[];
}

interface FormDefinition {
  schemaVersion: number;
  sections: Section[];
}

interface FormRecord {
  id: number;
  name: string;
  description?: string;
  definition?: FormDefinition;
}

const createId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const emptyDefinition: FormDefinition = {
  schemaVersion: 1,
  sections: [],
};

const questionTypes: { value: QuestionType; label: string }[] = [
  { value: 'short_text', label: 'Short Text' },
  { value: 'long_text', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'radio', label: 'Multiple Choice' },
  { value: 'checkbox', label: 'Checkboxes' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'date', label: 'Date' },
  { value: 'file_upload', label: 'File Upload / Attachment' },
  { value: 'content', label: 'Information / Text' },
  { value: 'owner_information', label: 'Owner Information' },
  { value: 'animal_information', label: 'Animal Information' },
  { value: 'signature', label: 'Signature' },
];

const choiceTypes: QuestionType[] = ['radio', 'checkbox', 'dropdown'];

const isChoiceType = (type: QuestionType) => choiceTypes.includes(type);

const isSpecialBlock = (type: QuestionType) =>
  type === 'owner_information' || type === 'animal_information';

const canBeBranchingSource = (question: Question) =>
  !question.staffOnly &&
  question.type !== 'content' &&
  question.type !== 'file_upload' &&
  question.type !== 'signature' &&
  !isSpecialBlock(question.type);

const getDefaultOptions = (type: QuestionType): string[] => {
  if (type === 'yes_no') return ['Yes', 'No'];

  if (isChoiceType(type)) {
    return ['Option 1', 'Option 2'];
  }

  return [];
};

/**
 * Supports both the old single-value condition format and
 * the new multiple-value format.
 */
function normalizeCondition(value: any): Condition | undefined {
  if (!value || typeof value !== 'object' || !value.questionId) {
    return undefined;
  }

  const values = Array.isArray(value.values)
    ? value.values
    : value.value
      ? [value.value]
      : [];

  return {
    questionId: value.questionId,
    operator:
      value.operator === 'not_equals' ? 'not_equals' : 'equals',
    values,
  };
}

function normalizeDefinition(value: any): FormDefinition {
  if (!value || typeof value !== 'object') return emptyDefinition;

  return {
    schemaVersion: value.schemaVersion ?? 1,
    sections: Array.isArray(value.sections)
      ? value.sections.map((section: any) => ({
          id: section.id ?? createId(),
          title: section.title ?? 'Untitled Section',
          description: section.description ?? '',
          condition: normalizeCondition(section.condition),
          questions: Array.isArray(section.questions)
            ? section.questions.map((question: any) => ({
                id: question.id ?? createId(),
                type: question.type ?? 'short_text',
                label: question.label ?? 'Untitled Question',
                required: question.required ?? false,
                staffOnly: question.staffOnly ?? false,
                options: Array.isArray(question.options)
                  ? question.options
                  : [],
                condition: normalizeCondition(question.condition),
                animalCountSource: question.animalCountSource ?? 'fixed',
                animalCountQuestionId: question.animalCountQuestionId,
                fileAccept:
                  question.fileAccept ?? '.pdf,.jpg,.jpeg,.png,.doc,.docx',
                allowMultipleFiles: question.allowMultipleFiles ?? true,
              }))
            : [],
        }))
      : [],
  };
}

/**
 * Removes conditions whose source question is no longer earlier in the form.
 */
function clearInvalidConditions(definition: FormDefinition): FormDefinition {
  const sections = definition.sections.map((section, sectionIndex) => {
    const earlierSectionQuestions = definition.sections
      .slice(0, sectionIndex)
      .flatMap((earlierSection) => earlierSection.questions)
      .filter(canBeBranchingSource);

    const validSectionSources = new Set(
      earlierSectionQuestions.map((question) => question.id)
    );

    const sectionCondition =
      section.condition &&
      !validSectionSources.has(section.condition.questionId)
        ? undefined
        : section.condition;

    const questions = section.questions.map((question, questionIndex) => {
      const earlierQuestions = [
        ...earlierSectionQuestions,
        ...section.questions
          .slice(0, questionIndex)
          .filter(canBeBranchingSource),
      ];

      const validQuestionSources = new Set(
        earlierQuestions.map((earlierQuestion) => earlierQuestion.id)
      );

      return {
        ...question,
        condition:
          question.condition &&
          !validQuestionSources.has(question.condition.questionId)
            ? undefined
            : question.condition,
      };
    });

    return {
      ...section,
      condition: sectionCondition,
      questions,
    };
  });

  return { ...definition, sections };
}

function FormBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  document.title = 'Edit Form';

  const [formName, setFormName] = useState('');
  const [definition, setDefinition] =
    useState<FormDefinition>(emptyDefinition);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [draggedQuestionId, setDraggedQuestionId] = useState<string | null>(null);

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set()
  );

  const [collapsedQuestions, setCollapsedQuestions] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    const fetchForm = async () => {
      try {
        setLoading(true);
        setError('');

        const res = await api.get(`/forms/${id}`);
        const form: FormRecord = res.data.form ?? res.data;

        setFormName(form.name ?? 'Animal Surrender Application');
        setDefinition(normalizeDefinition(form.definition));
      } catch (err) {
        console.error(err);
        setError('Unable to load this surrender form.');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchForm();
  }, [id]);

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const toggleQuestion = (questionId: string) => {
    setCollapsedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const addSection = () => {
    const newSection: Section = {
      id: createId(),
      title: 'New Section',
      description: '',
      questions: [],
    };

    setDefinition((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));

    setSaveMessage('');
  };

  const updateSection = (sectionId: string, changes: Partial<Section>) => {
    setDefinition((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === sectionId ? { ...section, ...changes } : section
      ),
    }));

    setSaveMessage('');
  };

  const moveSection = (sectionIndex: number, direction: -1 | 1) => {
    setDefinition((prev) => {
      const destination = sectionIndex + direction;

      if (destination < 0 || destination >= prev.sections.length) {
        return prev;
      }

      const sections = [...prev.sections];

      [sections[sectionIndex], sections[destination]] = [
        sections[destination],
        sections[sectionIndex],
      ];

      return clearInvalidConditions({ ...prev, sections });
    });

    setSaveMessage(
      'Section order updated. Any branching rules that were no longer valid were cleared.'
    );
  };

  const handleSectionDragStart = (
    event: DragEvent<HTMLButtonElement>,
    sectionId: string
  ) => {
    setDraggedSectionId(sectionId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', sectionId);
  };

  const handleSectionDrop = (
    event: DragEvent<HTMLElement>,
    targetSectionId: string
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const sourceSectionId =
      draggedSectionId || event.dataTransfer.getData('text/plain');

    if (!sourceSectionId || sourceSectionId === targetSectionId) {
      setDraggedSectionId(null);
      return;
    }

    const targetRect = event.currentTarget.getBoundingClientRect();
    const dropAfterTarget =
      event.clientY > targetRect.top + targetRect.height / 2;

    setDefinition((prev) => {
      const sections = [...prev.sections];

      const sourceIndex = sections.findIndex(
        (section) => section.id === sourceSectionId
      );

      const targetIndex = sections.findIndex(
        (section) => section.id === targetSectionId
      );

      if (sourceIndex < 0 || targetIndex < 0) return prev;

      const [movedSection] = sections.splice(sourceIndex, 1);

      let insertionIndex = targetIndex + (dropAfterTarget ? 1 : 0);

      if (sourceIndex < targetIndex) {
        insertionIndex -= 1;
      }

      sections.splice(insertionIndex, 0, movedSection);

      return clearInvalidConditions({ ...prev, sections });
    });

    setDraggedSectionId(null);

    setSaveMessage(
      'Section order updated. Any branching rules that were no longer valid were cleared.'
    );
  };

  const handleQuestionDragStart = (
    event: DragEvent<HTMLButtonElement>,
    sectionId: string,
    questionId: string
  ) => {
    const dragValue = `${sectionId}::${questionId}`;

    setDraggedQuestionId(dragValue);

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', dragValue);
  };

  const handleQuestionDrop = (
    event: DragEvent<HTMLElement>,
    targetSectionId: string,
    targetQuestionId: string
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const dragValue =
      draggedQuestionId || event.dataTransfer.getData('text/plain');

    const [sourceSectionId, sourceQuestionId] = dragValue.split('::');

    if (
      !sourceSectionId ||
      !sourceQuestionId ||
      sourceSectionId !== targetSectionId ||
      sourceQuestionId === targetQuestionId
    ) {
      setDraggedQuestionId(null);
      return;
    }

    const targetRect = event.currentTarget.getBoundingClientRect();
    const dropAfterTarget =
      event.clientY > targetRect.top + targetRect.height / 2;

    setDefinition((prev) => {
      const sections = prev.sections.map((section) => {
        if (section.id !== targetSectionId) return section;

        const questions = [...section.questions];

        const sourceIndex = questions.findIndex(
          (question) => question.id === sourceQuestionId
        );

        const targetIndex = questions.findIndex(
          (question) => question.id === targetQuestionId
        );

        if (sourceIndex < 0 || targetIndex < 0) return section;

        const [movedQuestion] = questions.splice(sourceIndex, 1);

        let insertionIndex = targetIndex + (dropAfterTarget ? 1 : 0);

        if (sourceIndex < targetIndex) {
          insertionIndex -= 1;
        }

        questions.splice(insertionIndex, 0, movedQuestion);

        return { ...section, questions };
      });

      return clearInvalidConditions({ ...prev, sections });
    });

    setDraggedQuestionId(null);

    setSaveMessage(
      'Question order updated. Any branching rules that were no longer valid were cleared.'
    );
  };

  const deleteSection = (sectionId: string) => {
    const section = definition.sections.find((item) => item.id === sectionId);

    if (
      !window.confirm(
        `Delete "${section?.title ?? 'this section'}" and all of its questions?`
      )
    ) {
      return;
    }

    const deletedQuestionIds = new Set(
      section?.questions.map((question) => question.id) ?? []
    );

    setDefinition((prev) => {
      const next = {
        ...prev,
        sections: prev.sections
          .filter((item) => item.id !== sectionId)
          .map((item) => ({
            ...item,
            condition:
              item.condition &&
              deletedQuestionIds.has(item.condition.questionId)
                ? undefined
                : item.condition,
            questions: item.questions.map((question) => ({
              ...question,
              condition:
                question.condition &&
                deletedQuestionIds.has(question.condition.questionId)
                  ? undefined
                  : question.condition,
            })),
          })),
      };

      return clearInvalidConditions(next);
    });

    setCollapsedSections((prev) => {
      const next = new Set(prev);
      next.delete(sectionId);
      return next;
    });

    setSaveMessage('');
  };

  const addQuestion = (sectionId: string) => {
    const newQuestion: Question = {
      id: createId(),
      type: 'short_text',
      label: 'New Question',
      required: true,
      staffOnly: false,
      options: [],
    };

    setDefinition((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === sectionId
          ? { ...section, questions: [...section.questions, newQuestion] }
          : section
      ),
    }));

    setCollapsedQuestions((prev) => {
      const next = new Set(prev);
      next.delete(newQuestion.id);
      return next;
    });

    setSaveMessage('');
  };

  const updateQuestion = (
    sectionId: string,
    questionId: string,
    changes: Partial<Question>
  ) => {
    setDefinition((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              questions: section.questions.map((question) =>
                question.id === questionId
                  ? { ...question, ...changes }
                  : question
              ),
            }
          : section
      ),
    }));

    setSaveMessage('');
  };

  const moveQuestion = (
    sectionId: string,
    questionIndex: number,
    direction: -1 | 1
  ) => {
    setDefinition((prev) => {
      const sections = prev.sections.map((section) => {
        if (section.id !== sectionId) return section;

        const destination = questionIndex + direction;

        if (
          destination < 0 ||
          destination >= section.questions.length
        ) {
          return section;
        }

        const questions = [...section.questions];

        [questions[questionIndex], questions[destination]] = [
          questions[destination],
          questions[questionIndex],
        ];

        return { ...section, questions };
      });

      return clearInvalidConditions({ ...prev, sections });
    });

    setSaveMessage(
      'Question order updated. Any branching rules that were no longer valid were cleared.'
    );
  };

  const deleteQuestion = (questionId: string) => {
    setDefinition((prev) => {
      const next = {
        ...prev,
        sections: prev.sections.map((section) => ({
          ...section,
          questions: section.questions
            .filter((question) => question.id !== questionId)
            .map((question) => ({
              ...question,
              condition:
                question.condition?.questionId === questionId
                  ? undefined
                  : question.condition,
            })),
          condition:
            section.condition?.questionId === questionId
              ? undefined
              : section.condition,
        })),
      };

      return clearInvalidConditions(next);
    });

    setCollapsedQuestions((prev) => {
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });

    setSaveMessage('');
  };

  const changeQuestionType = (
    sectionId: string,
    question: Question,
    type: QuestionType
  ) => {
    updateQuestion(sectionId, question.id, {
      type,
      options: getDefaultOptions(type),
      required:
        type === 'content' || isSpecialBlock(type)
          ? false
          : question.required,
      staffOnly: isSpecialBlock(type) ? false : question.staffOnly,
      condition: canBeBranchingSource({ ...question, type })
        ? question.condition
        : undefined,
    });
  };

  /**
   * Returns earlier public questions grouped by their section.
   * This keeps the branching editor organized instead of presenting
   * every previous question in one enormous dropdown.
   */
  const getPreviousQuestionGroups = (
    sectionIndex: number,
    questionIndex?: number
  ): QuestionGroup[] => {
    const groups: QuestionGroup[] = [];

    definition.sections.forEach((section, currentSectionIndex) => {
      if (currentSectionIndex > sectionIndex) return;

      const questionsToInclude =
        currentSectionIndex === sectionIndex && questionIndex !== undefined
          ? section.questions.slice(0, questionIndex)
          : currentSectionIndex === sectionIndex
            ? []
            : section.questions;

      const availableQuestions = questionsToInclude.filter(
        canBeBranchingSource
      );

      if (availableQuestions.length > 0) {
        groups.push({
          sectionId: section.id,
          sectionTitle: section.title || 'Untitled Section',
          questions: availableQuestions,
        });
      }
    });

    return groups;
  };

  const getPreviousQuestions = (
    sectionIndex: number,
    questionIndex?: number
  ): Question[] =>
    getPreviousQuestionGroups(sectionIndex, questionIndex).flatMap(
      (group) => group.questions
    );

  const renderConditionEditor = (
    condition: Condition | undefined,
    availableGroups: QuestionGroup[],
    onChange: (condition: Condition | undefined) => void
  ) => {
    const selectedGroup = availableGroups.find((group) =>
      group.questions.some(
        (question) => question.id === condition?.questionId
      )
    );

    const sourceQuestion = selectedGroup?.questions.find(
      (question) => question.id === condition?.questionId
    );

    const sourceOptions =
      sourceQuestion?.type === 'yes_no'
        ? ['Yes', 'No']
        : sourceQuestion?.options.filter((option) => option.trim()) ?? [];

    const selectedValues = condition?.values ?? [];

    return (
      <div className="mt-3 p-3 bg-light rounded">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <strong>
            <FontAwesomeIcon icon={faList} className="me-2 text-secondary" />
            Branching Rule
          </strong>

          {condition && (
            <Button
              variant="link"
              size="sm"
              className="text-danger p-0"
              onClick={() => onChange(undefined)}
            >
              <FontAwesomeIcon icon={faTrash} className="me-1" />
              Remove Rule
            </Button>
          )}
        </div>

        <p className="text-muted small mb-3">
          Optionally show this item only when an earlier public question has
          one or more matching answers.
        </p>

        <Form.Group className="mb-2">
          <Form.Label className="small">
            Show when a question in this section is answered
          </Form.Label>

          <Form.Select
            size="sm"
            value={selectedGroup?.sectionId ?? ''}
            onChange={(e) => {
              const group = availableGroups.find(
                (item) => item.sectionId === e.target.value
              );

              if (!group || group.questions.length === 0) {
                onChange(undefined);
                return;
              }

              onChange({
                questionId: group.questions[0].id,
                operator: 'equals',
                values: [],
              });
            }}
          >
            <option value="">Choose an earlier section</option>

            {availableGroups.map((group) => (
              <option key={group.sectionId} value={group.sectionId}>
                {group.sectionTitle}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        {selectedGroup && (
          <Form.Group className="mb-3">
            <Form.Label className="small">
              Which question?
            </Form.Label>

            <Form.Select
              size="sm"
              value={condition?.questionId ?? ''}
              onChange={(e) => {
                onChange({
                  questionId: e.target.value,
                  operator: 'equals',
                  values: [],
                });
              }}
            >
              {selectedGroup.questions.map((question) => (
                <option key={question.id} value={question.id}>
                  {question.label || 'Untitled Question'}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        )}

        {sourceQuestion && (
          <>
            <Form.Group className="mb-3">
              <Form.Label className="small">
                Condition
              </Form.Label>

              <Form.Select
                size="sm"
                value={condition?.operator ?? 'equals'}
                onChange={(e) =>
                  onChange({
                    ...condition!,
                    operator: e.target.value as Condition['operator'],
                  })
                }
              >
                <option value="equals">Equals any selected answer</option>
                <option value="not_equals">
                  Does not equal any selected answer
                </option>
              </Form.Select>
            </Form.Group>

            <Form.Group>
              <Form.Label className="small">
                Matching Answer(s)
              </Form.Label>

              {sourceOptions.length > 0 ? (
                <div className="border rounded bg-white p-2">
                  {sourceOptions.map((option, index) => (
                    <Form.Check
                      key={`${sourceQuestion.id}-${index}`}
                      type="checkbox"
                      id={`condition-${sourceQuestion.id}-${index}`}
                      label={option}
                      checked={selectedValues.includes(option)}
                      onChange={(e) => {
                        const updatedValues = e.target.checked
                          ? [...selectedValues, option]
                          : selectedValues.filter(
                              (value) => value !== option
                            );

                        onChange({
                          ...condition!,
                          values: updatedValues,
                        });
                      }}
                      className="mb-1"
                    />
                  ))}

                  <Form.Text className="text-muted">
                    Select one or more answers. Any selected answer will
                    satisfy this rule.
                  </Form.Text>
                </div>
              ) : (
                <Form.Control
                  size="sm"
                  value={selectedValues[0] ?? ''}
                  onChange={(e) =>
                    onChange({
                      ...condition!,
                      values: e.target.value ? [e.target.value] : [],
                    })
                  }
                  placeholder="Enter the matching answer"
                />
              )}
            </Form.Group>
          </>
        )}

        {availableGroups.length === 0 && (
          <small className="text-muted">
            Add an earlier public-facing question before creating a branching
            rule.
          </small>
        )}
      </div>
    );
  };

  const saveForm = async () => {
    try {
      setSaving(true);
      setError('');
      setSaveMessage('');

      await api.put(`/forms/${id}`, { definition });

      setSaveMessage('Form saved successfully.');
    } catch (err) {
      console.error(err);
      setError('Unable to save the form. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const SaveButton = ({ block = false }: { block?: boolean }) => (
    <Button
      variant="primary"
      className={block ? 'w-100' : ''}
      onClick={saveForm}
      disabled={saving}
    >
      <FontAwesomeIcon icon={faSave} className="me-2" />
      {saving ? 'Saving...' : 'Save Form'}
    </Button>
  );

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
        <p className="text-muted mt-2">Loading form builder...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="align-items-center mb-4 g-3">
        <Col>
          <h2 className="mb-1">{formName}</h2>
          <p className="text-muted mb-0">
            Build and organize this application. Drag sections and elements
            using the grip handles, or use the arrow buttons.
          </p>
        </Col>

        <Col xs="auto">
          <Button
            variant="outline-secondary"
            className="me-2"
            onClick={() => navigate('/surrender-forms')}
          >
            <FontAwesomeIcon
              icon={faArrowUp}
              rotation={270}
              className="me-2"
            />
            Back
          </Button>

          <SaveButton />
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}
      {saveMessage && <Alert variant="success">{saveMessage}</Alert>}

      <Row className="g-4">
        <Col xs={12} lg={3} xl={2}>
          <Card className="mb-3">
            <Card.Header>
              <FontAwesomeIcon icon={faList} className="me-2" />
              <strong>Form Elements</strong>
            </Card.Header>

            <Card.Body>
              <Button
                variant="outline-primary"
                className="w-100 mb-2"
                onClick={addSection}
              >
                <FontAwesomeIcon icon={faPlus} className="me-2" />
                Add Section
              </Button>

              <p className="text-muted small mb-0 mt-2">
                Sections organize related questions into logical parts of the
                application.
              </p>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <FontAwesomeIcon icon={faCircleInfo} className="me-2" />
              <strong>Form Overview</strong>
            </Card.Header>

            <Card.Body>
              <div className="mb-2">
                <strong>{definition.sections.length}</strong>
                <span className="text-muted ms-1">sections</span>
              </div>

              <div>
                <strong>
                  {definition.sections.reduce(
                    (total, section) => total + section.questions.length,
                    0
                  )}
                </strong>
                <span className="text-muted ms-1">questions</span>
              </div>

              <hr />

              <div className="small text-muted">
                Changes are saved when you click Save Form.
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} lg={9} xl={10}>
          {definition.sections.length === 0 ? (
            <Card>
              <Card.Body className="text-center py-5">
                <FontAwesomeIcon
                  icon={faList}
                  size="2x"
                  className="text-muted mb-3"
                />

                <h4>Your application is empty</h4>

                <p className="text-muted">
                  Start by creating a section. You can then add questions and
                  branching rules directly inside it.
                </p>

                <Button onClick={addSection}>
                  <FontAwesomeIcon icon={faPlus} className="me-2" />
                  Add First Section
                </Button>
              </Card.Body>
            </Card>
          ) : (
            definition.sections.map((section, sectionIndex) => {
              const sectionCollapsed = collapsedSections.has(section.id);

              return (
                <Card
                  key={section.id}
                  className={`mb-4 shadow-sm ${
                    draggedSectionId === section.id ? 'opacity-50' : ''
                  }`}
                  onDragOver={(event) => {
                    if (draggedSectionId) event.preventDefault();
                  }}
                  onDrop={(event) => handleSectionDrop(event, section.id)}
                >
                  <Card.Header className="bg-light py-3">
                    <div className="d-flex justify-content-between align-items-center gap-3">
                      <Button
                        variant="link"
                        className="text-start text-decoration-none text-dark p-0 flex-grow-1"
                        onClick={() => toggleSection(section.id)}
                        aria-expanded={!sectionCollapsed}
                      >
                        <FontAwesomeIcon
                          icon={
                            sectionCollapsed ? faChevronRight : faChevronDown
                          }
                          className="me-2"
                        />

                        <Badge bg="secondary" className="me-2">
                          Section {sectionIndex + 1}
                        </Badge>

                        <strong>
                          {section.title || 'Untitled Section'}
                        </strong>

                        <Badge bg="light" text="dark" className="ms-2">
                          {section.questions.length}{' '}
                          {section.questions.length === 1
                            ? 'element'
                            : 'elements'}
                        </Badge>
                      </Button>

                      <div className="d-flex align-items-center gap-1 flex-shrink-0">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          draggable
                          title="Drag to reorder section"
                          aria-label="Drag to reorder section"
                          onDragStart={(event) =>
                            handleSectionDragStart(event, section.id)
                          }
                          onDragEnd={() => setDraggedSectionId(null)}
                          style={{ cursor: 'grab' }}
                        >
                          <FontAwesomeIcon icon={faGripVertical} />
                        </Button>

                        <Button
                          variant="outline-secondary"
                          size="sm"
                          title="Move section up"
                          aria-label="Move section up"
                          disabled={sectionIndex === 0}
                          onClick={() => moveSection(sectionIndex, -1)}
                        >
                          <FontAwesomeIcon icon={faArrowUp} />
                        </Button>

                        <Button
                          variant="outline-secondary"
                          size="sm"
                          title="Move section down"
                          aria-label="Move section down"
                          disabled={
                            sectionIndex === definition.sections.length - 1
                          }
                          onClick={() => moveSection(sectionIndex, 1)}
                        >
                          <FontAwesomeIcon icon={faArrowDown} />
                        </Button>

                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => deleteSection(section.id)}
                          title="Delete section"
                          aria-label="Delete section"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </Button>
                      </div>
                    </div>
                  </Card.Header>

                  {!sectionCollapsed && (
                    <Card.Body>
                      <Form.Group className="mb-3">
                        <Form.Label>
                          <strong>Section Title</strong>
                        </Form.Label>

                        <Form.Control
                          value={section.title}
                          onChange={(e) =>
                            updateSection(section.id, {
                              title: e.target.value,
                            })
                          }
                          placeholder="Enter section title"
                        />
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>
                          <strong>Description / Instructions</strong>
                        </Form.Label>

                        <Form.Control
                          as="textarea"
                          rows={2}
                          value={section.description}
                          onChange={(e) =>
                            updateSection(section.id, {
                              description: e.target.value,
                            })
                          }
                          placeholder="Optional instructions displayed to applicants..."
                        />
                      </Form.Group>

                      {renderConditionEditor(
                        section.condition,
                        getPreviousQuestionGroups(sectionIndex),
                        (condition) =>
                          updateSection(section.id, { condition })
                      )}

                      <hr className="my-4" />

                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="mb-0">
                          <FontAwesomeIcon icon={faList} className="me-2" />
                          Questions and Form Elements
                        </h6>

                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => addQuestion(section.id)}
                        >
                          <FontAwesomeIcon icon={faPlus} className="me-1" />
                          Add Element
                        </Button>
                      </div>

                      {section.questions.length === 0 && (
                        <div className="text-center text-muted py-4 border rounded mb-3">
                          This section does not have any elements yet.
                        </div>
                      )}

                      {section.questions.map((question, questionIndex) => {
                        const questionCollapsed = collapsedQuestions.has(
                          question.id
                        );

                        return (
                          <Card
                            key={question.id}
                            className={`mb-3 border ${
                              draggedQuestionId === `${section.id}::${question.id}`
                                ? 'opacity-50'
                                : ''
                            }`}
                            onDragOver={(event) => {
                              if (draggedQuestionId) event.preventDefault();
                            }}
                            onDrop={(event) =>
                              handleQuestionDrop(
                                event,
                                section.id,
                                question.id
                              )
                            }
                          >
                            <Card.Header className="bg-white">
                              <div className="d-flex justify-content-between align-items-center gap-3">
                                <Button
                                  variant="link"
                                  className="text-start text-decoration-none text-dark p-0 flex-grow-1"
                                  onClick={() =>
                                    toggleQuestion(question.id)
                                  }
                                  aria-expanded={!questionCollapsed}
                                >
                                  <FontAwesomeIcon
                                    icon={
                                      questionCollapsed
                                        ? faChevronRight
                                        : faChevronDown
                                    }
                                    className="me-2"
                                  />

                                  <strong>
                                    {sectionIndex + 1}.{questionIndex + 1}{' '}
                                    {isSpecialBlock(question.type)
                                      ? question.type === 'owner_information'
                                        ? 'Owner Information'
                                        : 'Animal Information'
                                      : question.label || 'Untitled Question'}
                                  </strong>

                                  {!isSpecialBlock(question.type) &&
                                    question.required && (
                                      <Badge bg="danger" className="ms-2">
                                        Required
                                      </Badge>
                                    )}

                                  {!isSpecialBlock(question.type) &&
                                    question.staffOnly && (
                                      <Badge
                                        bg="warning"
                                        text="dark"
                                        className="ms-2"
                                      >
                                        Staff Only
                                      </Badge>
                                    )}

                                  {question.condition && (
                                    <Badge bg="info" className="ms-2">
                                      Conditional
                                    </Badge>
                                  )}
                                </Button>

                                <div className="d-flex align-items-center gap-1 flex-shrink-0">
                                  <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    draggable
                                    title="Drag to reorder element"
                                    aria-label="Drag to reorder element"
                                    onDragStart={(event) =>
                                      handleQuestionDragStart(
                                        event,
                                        section.id,
                                        question.id
                                      )
                                    }
                                    onDragEnd={() => setDraggedQuestionId(null)}
                                    style={{ cursor: 'grab' }}
                                  >
                                    <FontAwesomeIcon icon={faGripVertical} />
                                  </Button>

                                  <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    title="Move element up"
                                    aria-label="Move element up"
                                    disabled={questionIndex === 0}
                                    onClick={() =>
                                      moveQuestion(
                                        section.id,
                                        questionIndex,
                                        -1
                                      )
                                    }
                                  >
                                    <FontAwesomeIcon icon={faArrowUp} />
                                  </Button>

                                  <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    title="Move element down"
                                    aria-label="Move element down"
                                    disabled={
                                      questionIndex ===
                                      section.questions.length - 1
                                    }
                                    onClick={() =>
                                      moveQuestion(
                                        section.id,
                                        questionIndex,
                                        1
                                      )
                                    }
                                  >
                                    <FontAwesomeIcon icon={faArrowDown} />
                                  </Button>

                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    title="Delete element"
                                    aria-label="Delete element"
                                    onClick={() => deleteQuestion(question.id)}
                                  >
                                    <FontAwesomeIcon icon={faTrash} />
                                  </Button>
                                </div>
                              </div>
                            </Card.Header>

                            {!questionCollapsed && (
                              <Card.Body>
                                <Form.Group className="mb-3">
                                  <Form.Label>
                                    <strong>
                                      {isSpecialBlock(question.type)
                                        ? 'Form Element'
                                        : 'Answer Type'}
                                    </strong>
                                  </Form.Label>

                                  <Form.Select
                                    value={question.type}
                                    onChange={(e) =>
                                      changeQuestionType(
                                        section.id,
                                        question,
                                        e.target.value as QuestionType
                                      )
                                    }
                                  >
                                    {questionTypes.map((type) => (
                                      <option
                                        key={type.value}
                                        value={type.value}
                                      >
                                        {type.label}
                                      </option>
                                    ))}
                                  </Form.Select>
                                </Form.Group>

                                {question.type === 'owner_information' && (
                                  <div className="border rounded p-3 bg-light mb-3">
                                    <h6 className="mb-2">
                                      <FontAwesomeIcon
                                        icon={faUser}
                                        className="me-2"
                                      />
                                      Owner Information
                                    </h6>

                                    <p className="text-muted small mb-2">
                                      This element will display the standard
                                      owner information form to the applicant.
                                    </p>

                                    <ul className="small mb-0">
                                      <li>First and last name</li>
                                      <li>Email and phone number</li>
                                      <li>Address and secondary address</li>
                                      <li>
                                        City, county, state, and ZIP code
                                      </li>
                                    </ul>
                                  </div>
                                )}

                                {question.type === 'animal_information' && (
                                  <div className="border rounded p-3 bg-light mb-3">
                                    <h6 className="mb-2">
                                      <FontAwesomeIcon
                                        icon={faPaw}
                                        className="me-2"
                                      />
                                      Animal Information
                                    </h6>

                                    <p className="text-muted small mb-2">
                                      This element will display the standard
                                      Animal Form to the applicant.
                                    </p>

                                    <ul className="small mb-0">
                                      <li>Animal name and species</li>
                                      <li>Sex and altered status</li>
                                      <li>Breed, color, and pattern</li>
                                      <li>
                                        Age, approximate birthdate, and weight
                                      </li>
                                      <li>Microchip information</li>
                                    </ul>

                                    <hr />

                                    <Form.Group className="mb-3">
                                      <Form.Label>
                                        <strong>
                                          How should the number of animals be
                                          determined?
                                        </strong>
                                      </Form.Label>

                                      <Form.Select
                                        value={
                                          question.animalCountSource ?? 'fixed'
                                        }
                                        onChange={(e) =>
                                          updateQuestion(
                                            section.id,
                                            question.id,
                                            {
                                              animalCountSource: e.target
                                                .value as
                                                | 'fixed'
                                                | 'question',
                                              animalCountQuestionId: undefined,
                                            }
                                          )
                                        }
                                      >
                                        <option value="fixed">
                                          Fixed number of animals
                                        </option>
                                        <option value="question">
                                          Based on an earlier number question
                                        </option>
                                      </Form.Select>
                                    </Form.Group>

                                    {question.animalCountSource ===
                                      'question' && (
                                      <Form.Group>
                                        <Form.Label>
                                          <strong>
                                            Which question determines the
                                            number of animals?
                                          </strong>
                                        </Form.Label>

                                        <Form.Select
                                          value={
                                            question.animalCountQuestionId ??
                                            ''
                                          }
                                          onChange={(e) =>
                                            updateQuestion(
                                              section.id,
                                              question.id,
                                              {
                                                animalCountQuestionId:
                                                  e.target.value,
                                              }
                                            )
                                          }
                                        >
                                          <option value="">
                                            Choose a number question
                                          </option>

                                          {getPreviousQuestions(
                                            sectionIndex,
                                            questionIndex
                                          )
                                            .filter(
                                              (q) => q.type === 'number'
                                            )
                                            .map((q) => (
                                              <option
                                                key={q.id}
                                                value={q.id}
                                              >
                                                {q.label}
                                              </option>
                                            ))}
                                        </Form.Select>

                                        {getPreviousQuestions(
                                          sectionIndex,
                                          questionIndex
                                        ).filter((q) => q.type === 'number')
                                          .length === 0 && (
                                          <Form.Text className="text-muted">
                                            Add a Number question before this
                                            Animal Information block to use it
                                            as the animal count.
                                          </Form.Text>
                                        )}
                                      </Form.Group>
                                    )}
                                  </div>
                                )}

                                {!isSpecialBlock(question.type) && (
                                  <>
                                    <Form.Group className="mb-3">
                                      <Form.Label>
                                        <strong>
                                          {question.type === 'content'
                                            ? 'Information / Content'
                                            : 'Question'}
                                        </strong>
                                      </Form.Label>

                                      <Form.Control
                                        as="textarea"
                                        rows={2}
                                        value={question.label}
                                        onChange={(e) =>
                                          updateQuestion(
                                            section.id,
                                            question.id,
                                            {
                                              label: e.target.value,
                                            }
                                          )
                                        }
                                        placeholder="Enter question wording..."
                                      />
                                    </Form.Group>

                                    {question.type === 'number' && (
                                      <Form.Text className="text-muted d-block mb-3">
                                        Applicants will enter a numeric value.
                                        Minimum and maximum limits can be added
                                        when we build the public form.
                                      </Form.Text>
                                    )}

                                    {isChoiceType(question.type) && (
                                      <Form.Group className="mb-3">
                                        <Form.Label>
                                          <strong>Answer Choices</strong>
                                        </Form.Label>

                                        {question.options.map(
                                          (option, optionIndex) => (
                                            <div
                                              key={optionIndex}
                                              className="d-flex gap-2 mb-2 align-items-center"
                                            >
                                              <Form.Control
                                                value={option}
                                                onChange={(e) => {
                                                  const updatedOptions = [
                                                    ...question.options,
                                                  ];

                                                  updatedOptions[optionIndex] =
                                                    e.target.value;

                                                  updateQuestion(
                                                    section.id,
                                                    question.id,
                                                    {
                                                      options: updatedOptions,
                                                    }
                                                  );
                                                }}
                                                placeholder={`Choice ${
                                                  optionIndex + 1
                                                }`}
                                              />

                                              <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={() => {
                                                  const updatedOptions =
                                                    question.options.filter(
                                                      (_, index) =>
                                                        index !== optionIndex
                                                    );

                                                  updateQuestion(
                                                    section.id,
                                                    question.id,
                                                    {
                                                      options: updatedOptions,
                                                    }
                                                  );
                                                }}
                                                title="Remove choice"
                                                disabled={
                                                  question.options.length <= 1
                                                }
                                              >
                                                <FontAwesomeIcon
                                                  icon={faTrash}
                                                />
                                              </Button>
                                            </div>
                                          )
                                        )}

                                        <Button
                                          variant="outline-primary"
                                          size="sm"
                                          onClick={() =>
                                            updateQuestion(
                                              section.id,
                                              question.id,
                                              {
                                                options: [
                                                  ...question.options,
                                                  '',
                                                ],
                                              }
                                            )
                                          }
                                        >
                                          <FontAwesomeIcon
                                            icon={faPlus}
                                            className="me-1"
                                          />
                                          Add Answer Choice
                                        </Button>
                                      </Form.Group>
                                    )}

                                    {question.type === 'file_upload' && (
                                      <div className="border rounded p-3 bg-light mb-3">
                                        <h6 className="mb-2">
                                          File Upload Settings
                                        </h6>

                                        <p className="text-muted small">
                                          Applicants will be able to attach
                                          files to this question. File storage
                                          and upload processing will be
                                          connected when the backend is
                                          implemented.
                                        </p>

                                        <Form.Group className="mb-3">
                                          <Form.Label>
                                            <strong>Accepted File Types</strong>
                                          </Form.Label>

                                          <Form.Control
                                            value={
                                              question.fileAccept ??
                                              '.pdf,.jpg,.jpeg,.png,.doc,.docx'
                                            }
                                            onChange={(e) =>
                                              updateQuestion(
                                                section.id,
                                                question.id,
                                                { fileAccept: e.target.value }
                                              )
                                            }
                                            placeholder=".pdf,.jpg,.png,.doc,.docx"
                                          />

                                          <Form.Text className="text-muted">
                                            Enter extensions separated by
                                            commas. For example: .pdf,.jpg,.png
                                          </Form.Text>
                                        </Form.Group>

                                        <Form.Check
                                          type="switch"
                                          id={`multiple-files-${question.id}`}
                                          label="Allow multiple files"
                                          checked={
                                            question.allowMultipleFiles ?? true
                                          }
                                          onChange={(e) =>
                                            updateQuestion(
                                              section.id,
                                              question.id,
                                              {
                                                allowMultipleFiles:
                                                  e.target.checked,
                                              }
                                            )
                                          }
                                        />
                                      </div>
                                    )}
                                    {question.type === 'signature' && (
                                      <div className="border rounded p-3 bg-light mb-3">
                                        <h6 className="mb-2">Signature Settings</h6>

                                        <p className="text-muted small mb-2">
                                          Applicants will be able to provide their signature using any of
                                          the following methods:
                                        </p>

                                        <ul className="small mb-0">
                                          <li>Type their name using a signature-style font</li>
                                          <li>Draw their signature using a mouse, stylus, or touchscreen</li>
                                          <li>Upload an image of their signature</li>
                                        </ul>
                                      </div>
                                    )}

                                    {question.type !== 'content' && (
                                      <Row className="g-3">
                                        <Col xs={12} md={6}>
                                          <Form.Check
                                            type="switch"
                                            id={`required-${question.id}`}
                                            label="Required Question"
                                            checked={question.required}
                                            onChange={(e) =>
                                              updateQuestion(
                                                section.id,
                                                question.id,
                                                {
                                                  required: e.target.checked,
                                                }
                                              )
                                            }
                                          />
                                        </Col>

                                        <Col xs={12} md={6}>
                                          <Form.Check
                                            type="switch"
                                            id={`staff-only-${question.id}`}
                                            label="Staff Only (not shown to applicants)"
                                            checked={question.staffOnly}
                                            onChange={(e) =>
                                              updateQuestion(
                                                section.id,
                                                question.id,
                                                {
                                                  staffOnly: e.target.checked,
                                                }
                                              )
                                            }
                                          />
                                        </Col>
                                      </Row>
                                    )}
                                  </>
                                )}

                                {renderConditionEditor(
                                  question.condition,
                                  getPreviousQuestionGroups(
                                    sectionIndex,
                                    questionIndex
                                  ),
                                  (condition) =>
                                    updateQuestion(section.id, question.id, {
                                      condition,
                                    })
                                )}
                              </Card.Body>
                            )}
                          </Card>
                        );
                      })}

                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => addQuestion(section.id)}
                      >
                        <FontAwesomeIcon icon={faPlus} className="me-1" />
                        Add Element to This Section
                      </Button>
                    </Card.Body>
                  )}
                </Card>
              );
            })
          )}

          {definition.sections.length > 0 && (
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 py-3">
              <Button
                variant="outline-primary"
                onClick={addSection}
              >
                <FontAwesomeIcon icon={faPlus} className="me-2" />
                Add Another Section
              </Button>

              <SaveButton />
            </div>
          )}
        </Col>
      </Row>
    </Container>
  );
}

export default FormBuilder;