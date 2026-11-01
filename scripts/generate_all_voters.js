import fs from 'fs';

// Helper function to create voter object
function createVoter(serial, epic, name, relType, relName, house, age, gender, page, vibhagNum, vibhagName) {
  const isFather = relType.includes('પિતા') || relType.toLowerCase().includes('father');
  const isHusband = relType.includes('પતિ') || relType.toLowerCase().includes('husband');
  const isMother = relType.includes('માતા') || relType.toLowerCase().includes('mother');
  const isOther = relType.includes('અન્ય') || relType.toLowerCase().includes('other');

  return {
    id: `rajkot-p${page}-s${serial}`,
    serialNumber: String(serial),
    epicNumber: epic.trim().toUpperCase(),
    voterName: name.trim(),
    relationshipType: isHusband ? 'Husband' : isMother ? 'Mother' : isOther ? 'Other' : 'Father',
    relationshipName: relName.trim(),
    fatherName: isFather ? relName.trim() : '',
    husbandName: isHusband ? relName.trim() : '',
    motherName: isMother ? relName.trim() : '',
    otherRelationName: isOther ? relName.trim() : '',
    houseNumber: String(house).trim(),
    age: Number(age),
    gender: gender.trim(),
    pageNumber: Number(page),
    vibhagNumber: String(vibhagNum),
    vibhagName: vibhagName,
    wardNumber: 'વોર્ડ નં. 1 (રૈયાધાર)',
    bhagNumber: '1',
    pdfName: '2026-EROLLGEN-S06-69-SIR-FinalRoll-Revision1-GUJ-1-WI_daa614cc.pdf',
    isDeleted: false,
    flags: !epic || epic.length < 5 ? ['missing_epic'] : Number(age) < 18 ? ['suspicious_age'] : [],
    confidence: 'high',
    isVerified: true
  };
}

console.log('Script initialized');
