const fs = require('fs');
const path = require('path');

const {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  rgb
} = require('pdf-lib');

// ==========================================
// DATE FORMATTING HELPER (YYYY-MM-DD -> MM/DD/YYYY)
// ==========================================
function formatDateToUS(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    return '';
  }

  const parts = dateString.split('-');

  if (parts.length !== 3) {
    return dateString;
  }

  const [year, month, day] = parts;

  return `${month}/${day}/${year}`;
}

// ==========================================
// NORMALIZATION HELPERS
// ==========================================
function normalizeSpecies(species) {
  if (!species) return 'Other';

  const s = String(species).trim().toLowerCase();

  if (s === 'dog') return 'Dog';
  if (s === 'cat') return 'Cat';
  if (s === 'ferret') return 'Ferret';

  return 'Other';
}

function normalizeSex(sex) {
  if (!sex) return null;

  const s = String(sex).trim().toLowerCase();

  if (s === 'male' || s === 'm') {
    return 'Male';
  }

  if (s === 'female' || s === 'f') {
    return 'Female';
  }

  return null;
}

function normalizeAgeUnit(unit) {
  if (!unit) return null;

  const u = String(unit).trim().toLowerCase();

  if (u === 'year' || u === 'years') {
    return 'Years';
  }

  if (u === 'month' || u === 'months') {
    return 'Months';
  }

  return null;
}

function normalizeCoordinateKey(groupName, key) {
  switch (groupName) {
    case 'Species':
      return normalizeSpecies(key);

    case 'Sex':
      return normalizeSex(key);

    case 'AgeUnit':
      return normalizeAgeUnit(key);

    default:
      return key;
  }
}

// ==========================================
// PHYSICAL X/Y COORDINATE MAP
// ==========================================
const COORDINATE_MAPS = {
  Species: {
    Dog:    { page: 0, x: 75, y: 589 },
    Cat:    { page: 0, x: 75, y: 576 },
    Ferret: { page: 0, x: 75, y: 563 },
    Other:  { page: 0, x: 75, y: 551 }
  },

  Sex: {
    Male:   { page: 0, x: 184, y: 564 },
    Female: { page: 0, x: 184, y: 551 }
  },

  Size: {
    'Under 20 lbs.': { page: 0, x: 310, y: 588 },
    '20 - 50 lbs.':  { page: 0, x: 310, y: 576 },
    'Over 50 lbs.':  { page: 0, x: 310, y: 564 }
  },

  AgeUnit: {
    Years:  { page: 0, x: 233, y: 576 },
    Months: { page: 0, x: 233, y: 589 }
  },

  Dose: {
    Initial: { page: 0, x: 168, y: 402 },
    Booster: { page: 0, x: 248, y: 402 }
  },

  USDALicensed: {
    '1 Year': { page: 0, x: 147, y: 453 },
    '3 Year': { page: 0, x: 147, y: 441 },
    '4 Year': { page: 0, x: 147, y: 429 }
  }
};

// ==========================================
// SIGNATURE POSITION
// ==========================================
// Adjust these after seeing the generated PDF.
const SIGNATURE_COORDINATES = {
  page: 0,
  x: 340,
  y: 440,
  width: 120,
  height: 45
};


// ==========================================
// SIGNATURE DRAWING HELPER
// ==========================================
async function drawSignature(pdfDoc, pages, signatureBuffer) {

  if (!signatureBuffer) {
    return;
  }

  try {

    let image;

    // PNG signature
    if (
      signatureBuffer[0] === 0x89 &&
      signatureBuffer[1] === 0x50 &&
      signatureBuffer[2] === 0x4E &&
      signatureBuffer[3] === 0x47
    ) {
      image = await pdfDoc.embedPng(signatureBuffer);
    }

    // JPEG signature
    else if (
      signatureBuffer[0] === 0xFF &&
      signatureBuffer[1] === 0xD8
    ) {
      image = await pdfDoc.embedJpg(signatureBuffer);
    }

    else {
      console.warn('Unsupported signature image format.');
      return;
    }


    pages[SIGNATURE_COORDINATES.page].drawImage(image, {
      x: SIGNATURE_COORDINATES.x,
      y: SIGNATURE_COORDINATES.y,
      width: SIGNATURE_COORDINATES.width,
      height: SIGNATURE_COORDINATES.height
    });


  } catch (err) {
    console.warn(
      'Failed embedding veterinarian signature:',
      err.message
    );
  }
}


async function generateRabiesForm(data) {

  // =========================
  // LOAD PDF
  // =========================
  const pdfPath = path.join(__dirname, '../templates/form51.pdf');
  const existingPdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  const form = pdfDoc.getForm();
  const pages = pdfDoc.getPages();


  // =========================
  // NORMALIZED FIELD MAP
  // =========================
  const fieldMap = new Map(
    form.getFields().map(f => [
      f.getName().trim(),
      f
    ])
  );

  function getField(name) {
    return fieldMap.get(name.trim());
  }


  // =========================
  // SAFE TEXT SANITIZER
  // =========================
  function sanitizeText(value, maxLength) {
    if (value == null) return '';

    let str = String(value);

    if (maxLength && str.length > maxLength) {
      str = str.slice(0, maxLength);
    }

    return str;
  }


  // =========================
  // GENERIC FIELD SETTER
  // =========================
  function setField(name, value) {

    try {

      const field = getField(name);

      if (!field) {
        console.warn(`Missing PDF field: ${name}`);
        return;
      }


      if (field instanceof PDFTextField) {

        const maxLength = field.getMaxLength();

        field.setText(
          sanitizeText(value, maxLength)
        );

      } else if (field instanceof PDFCheckBox) {

        if (value === true) {
          field.check();
        } else {
          field.uncheck();
        }

      }

    } catch (err) {

      console.warn(
        `Field error: ${name}`,
        err.message
      );

    }
  }


  // ===================================================
  // LAYER-SAFE VISUAL CHECK STAMPING
  // ===================================================
  function drawVisualCheck(groupName, key) {

    try {

      const normalizedKey =
        normalizeCoordinateKey(groupName, key);

      const coord =
        COORDINATE_MAPS[groupName]?.[normalizedKey];


      if (!coord) {

        console.warn(
          `No coordinates found for ${groupName} -> ${normalizedKey}`
        );

        return;
      }


      pages[coord.page].drawText('X', {

        x: coord.x,
        y: coord.y,
        size: 11,
        color: rgb(0, 0, 0)

      });


    } catch (err) {

      console.warn(
        `Failed stamping check for ${groupName}:`,
        err.message
      );

    }

  }


  // =========================
  // REMOVE RADIO FIELDS
  // =========================
  const radioFieldsToClear = [
    'Species',
    'Size',
    'Sex',
    'Months/Years',
    'Dose',
    'USDA Licensed Vaccine'
  ];


  radioFieldsToClear.forEach(fieldName => {

    try {

      const field = getField(fieldName);

      if (field) {
        form.removeField(field);
      }

    } catch (err) {

      console.warn(
        `Failed removing field ${fieldName}:`,
        err.message
      );

    }

  });


  // =========================
  // OWNER DATA
  // =========================
  setField('First Name', data.owner.firstName);
  setField('Last Name', data.owner.lastName);
  setField('Street', data.owner.address);
  setField('City', data.owner.city);
  setField('State', data.owner.state);
  setField('Zip Code', data.owner.zip);


  const phoneDigits =
    String(data.owner.phone || '')
      .replace(/\D/g, '');

  setField('Telephone #', phoneDigits);



  // =========================
  // ANIMAL DATA
  // =========================
  setField('Animal Name', data.animal.name);
  setField('Age', data.animal.age);
  setField('Predominent Breed', data.animal.breed);
  setField('Predominemt Colors/Markings', data.animal.colors);
  setField('Microchip #', data.animal.microchip);
  setField('Neutered', data.animal.neutered);


  drawVisualCheck('Species', data.animal.species);
  drawVisualCheck('Size', data.animal.size);
  drawVisualCheck('Sex', data.animal.sex);
  drawVisualCheck('AgeUnit', data.animal.ageUnit);



  // =========================
  // VACCINE DATA
  // =========================
  setField('Product Name', data.vaccine.product);
  setField('Vaccine Serial Number', data.vaccine.lotNumber);

  setField(
    'Date Vaccinated',
    formatDateToUS(data.vaccine.dateVaccinated)
  );

  setField(
    'Next Vaccination Date',
    formatDateToUS(data.vaccine.nextDueDate)
  );


  // =========================
  // MANUFACTURER LETTERS
  // =========================
  const manufacturer =
    String(data.vaccine.manufacturer || '')
      .trim()
      .toUpperCase()
      .padEnd(3, ' ');


  setField('Manufacturer', manufacturer[0]);
  setField('Man2', manufacturer[1]);
  setField('Man3', manufacturer[2]);



  // =========================
  // DOSE + USDA
  // =========================
  const doseStatus =
    data.vaccine.isBooster
      ? 'Booster'
      : 'Initial';


  drawVisualCheck(
    'Dose',
    doseStatus
  );


  drawVisualCheck(
    'USDALicensed',
    data.vaccine.doseType
  );



  // =========================
  // CLINIC / VET
  // =========================
  setField(
    'Rabies Tag #',
    data.clinic.rabiesTagNumber
  );


  setField(
    "Veterinarian's Name",
    data.vet.name
  );


  setField(
    "Veterinarian's address",
    data.vet.address
  );


  setField(
    'License Number',
    data.vet.licenseNumber
  );


  // NEW: DRAW DIGITAL SIGNATURE
  await drawSignature(
    pdfDoc,
    pages,
    data.vet.signature
  );



  ['Print Form', 'Reset Form'].forEach(fieldName => {

    try {

      const field = getField(fieldName);

      if (field) {
        form.removeField(field);
      }

    } catch (err) {

      console.warn(
        `Failed removing ${fieldName}`,
        err.message
      );

    }

  });



  // =========================
  // FINALIZE
  // =========================
  form.flatten();

  return await pdfDoc.save();

}

module.exports = {
  generateRabiesForm
};