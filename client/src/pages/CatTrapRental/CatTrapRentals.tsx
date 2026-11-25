
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  InputGroup,
  Row,
  Spinner,
  Table
} from 'react-bootstrap';
import {
  FaBox,
  FaCalendarAlt,
  FaCog,
  FaExclamationTriangle,
  FaHistory,
  FaPlus,
  FaSearch,
  FaSyncAlt,
  FaUndo,
  FaWarehouse
} from 'react-icons/fa';

import {
  getCatTrapRentalDashboard,
  getCatTrapRentals,
  type CatTrapRental,
  type CatTrapRentalDashboard,
  type CatTrapRentalStatus
} from '../../api/catTrapRentals.api';

import NewCatTrapRentalModal from './NewCatTrapRentalModal';
import ManageCatTrapRentalModal from './ManageCatTrapRentalModal';

// ==========================================
// HELPERS
// ==========================================

const formatDate = (date: string | null | undefined) => {
  if (!date) return '—';

  const parsed = new Date(`${date.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return '—';

  return parsed.toLocaleDateString();
};

const formatCurrency = (amount: number | string | null | undefined) => {
  const value = Number(amount ?? 0);

  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD'
  });
};

const getRenterName = (rental: CatTrapRental) => {
  const renter = rental.renter_information;

  return [renter?.first_name, renter?.last_name]
    .filter(Boolean)
    .join(' ') || 'Unknown renter';
};

const isOverdue = (rental: CatTrapRental) => {
  return (
    rental.status === 'active' &&
    rental.expected_return_date <
      new Date().toISOString().slice(0, 10)
  );
};

const getStatusBadge = (rental: CatTrapRental) => {
  if (rental.status === 'pending_signature') {
    return <Badge bg="warning" text="dark">Pending Signature</Badge>;
  }

  if (rental.status === 'returned') {
    return <Badge bg="success">Returned</Badge>;
  }

  if (rental.status === 'cancelled') {
    return <Badge bg="secondary">Cancelled</Badge>;
  }

  if (isOverdue(rental)) {
    return <Badge bg="danger">Overdue</Badge>;
  }

  return <Badge bg="primary">Active</Badge>;
};

// ==========================================
// STAT CARD
// ==========================================

interface StatCardProps {
  title: string;
  value: number | string;
  description: string;
  icon: React.ReactNode;
  variant?: string;
}

const StatCard = ({
  title,
  value,
  description,
  icon,
  variant = 'primary'
}: StatCardProps) => (
  <Card className="h-100 shadow-sm border-0">
    <Card.Body>
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <div className="text-muted small mb-2">{title}</div>
          <h2 className="fw-bold mb-1">{value}</h2>
          <div className="text-muted small">{description}</div>
        </div>

        <div
          className={`rounded-circle bg-${variant}-subtle text-${variant} p-3`}
        >
          {icon}
        </div>
      </div>
    </Card.Body>
  </Card>
);

// ==========================================
// PAGE
// ==========================================

const CatTrapRentals = () => {
  const navigate = useNavigate();

  const [dashboard, setDashboard] =
    useState<CatTrapRentalDashboard | null>(null);

  const [rentals, setRentals] = useState<CatTrapRental[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');

  const [statusFilter, setStatusFilter] = useState<
    'all' | CatTrapRentalStatus
  >('active');

  const [showNewRentalModal, setShowNewRentalModal] = useState(false);
  const [selectedRental, setSelectedRental] =
    useState<CatTrapRental | null>(null);

  // ==========================================
  // LOAD DATA
  // ==========================================

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      const [dashboardData, rentalData] = await Promise.all([
        getCatTrapRentalDashboard(),
        getCatTrapRentals({
          status: 'all',
          limit: 200
        })
      ]);

      setDashboard(dashboardData);
      setRentals(rentalData);
    } catch (err: any) {
      console.error('Unable to load cat trap rentals:', err);

      setError(
        err?.response?.data?.message ||
        'Unable to load cat trap rental information.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==========================================
  // FILTER RENTALS
  // ==========================================

  const filteredRentals = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rentals.filter((rental) => {
      const matchesStatus =
        statusFilter === 'all' || rental.status === statusFilter;

      const renterName = getRenterName(rental).toLowerCase();
      const phone = rental.renter_information?.phone?.toLowerCase() || '';

      const matchesSearch =
        !normalizedSearch ||
        renterName.includes(normalizedSearch) ||
        phone.includes(normalizedSearch) ||
        String(rental.id).includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [rentals, search, statusFilter]);

  // ==========================================
  // COUNTS
  // ==========================================

  const overdueCount = dashboard?.rentalCounts.overdue ?? 0;
  const availableCount = dashboard?.inventory.available ?? 0;

  const pendingSignatureCount = useMemo(
    () => rentals.filter(
      (rental) => rental.status === 'pending_signature'
    ).length,
    [rentals]
  );

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status" />
        <div className="text-muted mt-3">
          Loading cat trap rentals...
        </div>
      </Container>
    );
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <Container fluid className="py-4 px-lg-4">
      {/* PAGE HEADER */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Cat Trap Rentals</h2>
          <p className="text-muted mb-0">
            Manage trap inventory, active rentals, and returns.
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <Button
            variant="outline-secondary"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <Spinner size="sm" className="me-2" />
            ) : (
              <FaSyncAlt className="me-2" />
            )}
            Refresh
          </Button>

          <Button
            variant="outline-primary"
            onClick={() => navigate('/cat-trap-rentals/settings')}
          >
            <FaCog className="me-2" />
            Settings
          </Button>

          <Button
            variant="primary"
            onClick={() => setShowNewRentalModal(true)}
            disabled={availableCount <= 0}
          >
            <FaPlus className="me-2" />
            New Rental
          </Button>
        </div>
      </div>

      {error && (
        <Alert
          variant="danger"
          dismissible
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      {/* PENDING SIGNATURE NOTICE */}
      {pendingSignatureCount > 0 && (
        <Alert variant="warning" className="mb-4">
          <div className="d-flex align-items-center gap-2">
            <FaExclamationTriangle />
            <strong>
              {pendingSignatureCount} rental(s) awaiting customer signature
            </strong>
          </div>
          <div className="small mt-1">
            These rentals are not active until the customer signs their
            rental contract at a signing station.
          </div>
        </Alert>
      )}

      {/* INVENTORY SUMMARY */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} xl={3}>
          <StatCard
            title="Total Traps"
            value={dashboard?.inventory.total ?? 0}
            description="Configured inventory"
            icon={<FaWarehouse size={22} />}
            variant="primary"
          />
        </Col>

        <Col xs={12} sm={6} xl={3}>
          <StatCard
            title="Available"
            value={availableCount}
            description="Ready to rent"
            icon={<FaBox size={22} />}
            variant="success"
          />
        </Col>

        <Col xs={12} sm={6} xl={3}>
          <StatCard
            title="Currently Rented"
            value={dashboard?.inventory.rented ?? 0}
            description={`${dashboard?.rentalCounts.active ?? 0} active rental(s)`}
            icon={<FaCalendarAlt size={22} />}
            variant="info"
          />
        </Col>

        <Col xs={12} sm={6} xl={3}>
          <StatCard
            title="Overdue"
            value={dashboard?.inventory.overdue ?? 0}
            description={`${overdueCount} overdue rental(s)`}
            icon={<FaExclamationTriangle size={22} />}
            variant="danger"
          />
        </Col>
      </Row>

      {/* INVENTORY WARNING */}
      {dashboard && dashboard.inventory.total === 0 && (
        <Alert variant="warning" className="mb-4">
          <strong>Inventory hasn't been configured yet.</strong>
          {' '}Add your organization's total trap quantity in Settings
          before creating rentals.

          <div className="mt-2">
            <Button
              size="sm"
              variant="outline-dark"
              onClick={() => navigate('/cat-trap-rentals/settings')}
            >
              Configure Inventory
            </Button>
          </div>
        </Alert>
      )}

      {dashboard &&
        dashboard.inventory.total > 0 &&
        availableCount === 0 && (
          <Alert variant="warning" className="mb-4">
            All traps are currently rented or reserved. New rentals
            cannot be created until traps are returned or inventory
            is increased.
          </Alert>
        )}

      {/* RENTAL HISTORY */}
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-white border-0 pt-3 px-3 px-lg-4">
          <Row className="align-items-center g-3">
            <Col>
              <h5 className="fw-bold mb-1">
                <FaHistory className="me-2 text-muted" />
                Rental History
              </h5>

              <div className="text-muted small">
                View and manage your organization's trap rentals.
              </div>
            </Col>

            <Col xs={12} lg={7}>
              <Row className="g-2">
                <Col xs={12} md={7}>
                  <InputGroup>
                    <InputGroup.Text>
                      <FaSearch />
                    </InputGroup.Text>

                    <Form.Control
                      placeholder="Search renter, phone, or rental ID..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </InputGroup>
                </Col>

                <Col xs={12} md={5}>
                  <Form.Select
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(
                        e.target.value as typeof statusFilter
                      )
                    }
                  >
                    <option value="all">All Rentals</option>
                    <option value="pending_signature">
                      Pending Signature
                    </option>
                    <option value="active">Active</option>
                    <option value="returned">Returned</option>
                    <option value="cancelled">Cancelled</option>
                  </Form.Select>
                </Col>
              </Row>
            </Col>
          </Row>
        </Card.Header>

        <Card.Body className="p-0">
          {filteredRentals.length === 0 ? (
            <div className="text-center py-5 px-3">
              <FaBox size={36} className="text-muted mb-3" />

              <h6 className="fw-bold">
                {rentals.length === 0
                  ? 'No rentals yet'
                  : 'No matching rentals'}
              </h6>

              <p className="text-muted mb-3">
                {rentals.length === 0
                  ? 'Create your first cat trap rental to get started.'
                  : 'Try changing your search or status filter.'}
              </p>

              {rentals.length === 0 && (
                <Button
                  variant="primary"
                  onClick={() => setShowNewRentalModal(true)}
                  disabled={availableCount <= 0}
                >
                  <FaPlus className="me-2" />
                  Create First Rental
                </Button>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3 ps-lg-4">Renter</th>
                    <th>Quantity</th>
                    <th>Rental Date</th>
                    <th>Expected Return</th>
                    <th>Deposit</th>
                    <th>Status</th>
                    <th className="text-end pe-3 pe-lg-4">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRentals.map((rental) => (
                    <tr key={rental.id}>
                      <td className="ps-3 ps-lg-4">
                        <div className="fw-semibold">
                          {getRenterName(rental)}
                        </div>

                        <small className="text-muted">
                          {rental.renter_information?.phone || 'No phone'}
                        </small>
                      </td>

                      <td>
                        <Badge bg="light" text="dark" className="border">
                          {rental.quantity} trap(s)
                        </Badge>
                      </td>

                      <td>{formatDate(rental.rental_date)}</td>

                      <td>
                        <div
                          className={
                            isOverdue(rental)
                              ? 'text-danger fw-semibold'
                              : ''
                          }
                        >
                          {formatDate(rental.expected_return_date)}
                        </div>
                      </td>

                      <td>{formatCurrency(rental.deposit_amount)}</td>

                      <td>{getStatusBadge(rental)}</td>

                      <td className="text-end pe-3 pe-lg-4">
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => setSelectedRental(rental)}
                        >
                          {rental.status === 'active' ? (
                            <>
                              <FaUndo className="me-1" />
                              Manage
                            </>
                          ) : (
                            'View'
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>

        {filteredRentals.length > 0 && (
          <Card.Footer className="bg-white text-muted small">
            Showing {filteredRentals.length} of {rentals.length} rental(s)
          </Card.Footer>
        )}
      </Card>

      {/* NEW RENTAL MODAL */}
      <NewCatTrapRentalModal
        show={showNewRentalModal}
        onHide={() => setShowNewRentalModal(false)}
        onCreated={async () => {
          setShowNewRentalModal(false);
          await loadData(true);
        }}
      />

      {/* MANAGE / VIEW RENTAL MODAL */}
      <ManageCatTrapRentalModal
        show={!!selectedRental}
        rental={selectedRental}
        onHide={() => setSelectedRental(null)}
        onUpdated={async () => {
          await loadData(true);
        }}
      />
    </Container>
  );
};

export default CatTrapRentals;