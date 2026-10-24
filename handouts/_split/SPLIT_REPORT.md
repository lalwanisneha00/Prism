# Handout split report

Made by `node scripts/split-handouts.mjs`. Each semester's combined PDF was cut at pages where a course handout starts (a "Teaching Scheme" table near the top of the page, with the course code and name above it). The originals are unchanged.

- **Theory** = taught subjects (what Prism shows). **Lab** = laboratory/practical courses. **Other** = internships, seminars, projects.
- **Front** = pages before the first course (course outline tables, cover pages). They don't belong to any course on purpose.
- Most pieces are one page long: in these handouts each course fits on one dense page, so one-page pieces are normal and not flagged.
- Flagged: fewer than 4 or more than 9 theory courses, a repeated course code, a course without a code or title, or a scheme table that starts mid-page.

**Totals:** 72 semester PDFs, 624 course pieces, 401 theory courses.

Skipped folders: CSBS, CSSE.

## Course counts per semester

| Branch  | Sem | Pages | Front | Theory | Lab | Other | Flags |
| ------- | --- | ----- | ----- | ------ | --- | ----- | ----- |
| BIOTECH | 1   | 12    | 1     | 7      | 4   | 0     |       |
| BIOTECH | 2   | 14    | 1     | 7      | 3   | 3     |       |
| BIOTECH | 3   | 9     | 1     | 5      | 3   | 0     | 1     |
| BIOTECH | 4   | 10    | 1     | 5      | 4   | 0     |       |
| BIOTECH | 5   | 10    | 1     | 6      | 3   | 0     |       |
| BIOTECH | 6   | 15    | 1     | 10     | 3   | 0     | 1     |
| BIOTECH | 7   | 21    | 1     | 10     | 2   | 2     | 1     |
| BIOTECH | 8   | 2     | 0     | 0      | 0   | 1     | 1     |
| CHEM    | 1   | 14    | 1     | 7      | 3   | 3     |       |
| CHEM    | 2   | 12    | 1     | 7      | 4   | 0     |       |
| CHEM    | 3   | 9     | 1     | 5      | 2   | 1     |       |
| CHEM    | 4   | 11    | 1     | 5      | 4   | 1     |       |
| CHEM    | 5   | 11    | 1     | 7      | 3   | 0     |       |
| CHEM    | 6   | 13    | 1     | 9      | 3   | 0     |       |
| CHEM    | 7   | 14    | 1     | 9      | 2   | 2     |       |
| CHEM    | 8   | 3     | 1     | 0      | 0   | 2     | 1     |
| CIVIL   | 1   | 10    | 1     | 6      | 3   | 0     | 1     |
| CIVIL   | 2   | 9     | 1     | 4      | 4   | 0     | 1     |
| CIVIL   | 3   | 9     | 1     | 6      | 2   | 0     | 1     |
| CIVIL   | 4   | 10    | 1     | 5      | 4   | 0     | 1     |
| CIVIL   | 5   | 8     | 1     | 3      | 3   | 0     | 2     |
| CIVIL   | 6   | 7     | 1     | 3      | 3   | 0     | 2     |
| CIVIL   | 7   | 6     | 2     | 3      | 1   | 0     | 2     |
| CIVIL   | 8   | 3     | 1     | 0      | 0   | 2     | 1     |
| COMP    | 1   | 12    | 2     | 7      | 3   | 0     |       |
| COMP    | 2   | 15    | 2     | 6      | 4   | 3     | 1     |
| COMP    | 3   | 10    | 2     | 5      | 3   | 0     |       |
| COMP    | 4   | 14    | 2     | 7      | 3   | 0     |       |
| COMP    | 5   | 20    | 3     | 9      | 3   | 0     |       |
| COMP    | 6   | 27    | 3     | 15     | 3   | 0     | 1     |
| COMP    | 7   | 25    | 3     | 15     | 2   | 0     | 1     |
| COMP    | 8   | 1     | 1     | 0      | 0   | 0     | 1     |
| ECE     | 1   | 11    | 2     | 6      | 3   | 0     | 1     |
| ECE     | 2   | 13    | 2     | 4      | 4   | 3     | 1     |
| ECE     | 3   | 7     | 2     | 3      | 2   | 0     | 2     |
| ECE     | 4   | 10    | 2     | 4      | 3   | 0     | 1     |
| ECE     | 5   | 14    | 4     | 5      | 3   | 0     | 1     |
| ECE     | 6   | 21    | 3     | 11     | 3   | 0     | 2     |
| ECE     | 7   | 20    | 3     | 11     | 3   | 0     | 2     |
| ECE     | 8   | 1     | 1     | 0      | 0   | 0     | 1     |
| ELEC    | 1   | 4     | 2     | 1      | 1   | 0     | 1     |
| ELEC    | 2   | 2     | 2     | 0      | 0   | 0     | 1     |
| ELEC    | 3   | 10    | 2     | 5      | 3   | 0     |       |
| ELEC    | 4   | 13    | 2     | 6      | 4   | 1     |       |
| ELEC    | 5   | 20    | 2     | 10     | 8   | 0     | 1     |
| ELEC    | 6   | 17    | 2     | 8      | 6   | 1     |       |
| ELEC    | 7   | 15    | 2     | 8      | 5   | 0     |       |
| ELEC    | 8   | 4     | 2     | 0      | 0   | 2     | 1     |
| ICT     | 1   | 4     | 2     | 1      | 1   | 0     | 1     |
| ICT     | 2   | 6     | 2     | 2      | 2   | 0     | 1     |
| ICT     | 3   | 8     | 2     | 4      | 2   | 0     | 1     |
| ICT     | 4   | 10    | 3     | 4      | 3   | 0     | 1     |
| ICT     | 5   | 14    | 3     | 6      | 3   | 0     | 1     |
| ICT     | 6   | 14    | 3     | 7      | 2   | 0     | 1     |
| ICT     | 7   | 17    | 3     | 9      | 3   | 0     | 1     |
| ICT     | 8   | 1     | 1     | 0      | 0   | 0     | 1     |
| MECH    | 1   | 11    | 1     | 6      | 4   | 0     |       |
| MECH    | 2   | 9     | 1     | 5      | 3   | 0     |       |
| MECH    | 3   | 9     | 1     | 5      | 3   | 0     |       |
| MECH    | 4   | 11    | 1     | 5      | 5   | 0     |       |
| MECH    | 5   | 11    | 1     | 7      | 3   | 0     |       |
| MECH    | 6   | 13    | 1     | 8      | 4   | 0     |       |
| MECH    | 7   | 15    | 1     | 12     | 1   | 0     | 1     |
| MECH    | 8   | 1     | 1     | 0      | 0   | 0     | 1     |
| PETRO   | 1   | 13    | 1     | 7      | 5   | 0     |       |
| PETRO   | 2   | 14    | 1     | 7      | 3   | 3     |       |
| PETRO   | 3   | 10    | 1     | 6      | 2   | 1     |       |
| PETRO   | 4   | 9     | 1     | 5      | 3   | 0     |       |
| PETRO   | 5   | 10    | 1     | 6      | 2   | 1     |       |
| PETRO   | 6   | 10    | 1     | 7      | 2   | 0     |       |
| PETRO   | 7   | 10    | 1     | 7      | 1   | 1     |       |
| PETRO   | 8   | 2     | 1     | 0      | 0   | 1     | 1     |

## Flagged

- **BIOTECH sem 3**
  - code 24BT205T used 2 times
- **BIOTECH sem 6**
  - 10 theory courses (expected 4 to 9)
- **BIOTECH sem 7**
  - 10 theory courses (expected 4 to 9)
- **BIOTECH sem 8**
  - 0 theory courses (expected 4 to 9)
- **CHEM sem 8**
  - 0 theory courses (expected 4 to 9)
- **CIVIL sem 1**
  - no course code printed (9): Mathematics – I; Physics; Physics Laboratory; ENVIRONMENTAL SCIENCE; Workshop Practice; Biology For Engineers; Introduction to Computer Programming -I (For ME/CH/CL/BT); Introduction to Computer Programming -I Laboratory (For ME, CL, CH, BT); Universal Human Values
- **CIVIL sem 2**
  - no course code printed (8): Mathematics – II; Engineering Chemistry; Engineering Chemistry Laboratory; Elements of Electrical and Electronics Engineering; Elements of Electrical and Electronics Engineering Laboratory; Engineering Graphics - Laboratory; Intoduction to Computer Programming II (For ME/CL/CH/BT); Introduction to Computer Programming II Laboratory (For ME/CL/CH/BT)
- **CIVIL sem 3**
  - no course code printed (8): Mathematics – III; Introduction to Artificial Intelligence; Building Materials and Construction; Building Planning and Computer Aided Drawing; Building Planning and Computer Aided Drawing Lab; Solid Mechanics; Concrete Technology; Material Testing Laboratory
- **CIVIL sem 4**
  - no course code printed (9): Industry 4.0; Industry 4.0 Laboratory; Fluid Mechanics; Fluid Mechanics Laboratory; Engineering Geology and Soil Mechanics; Engineering Geology and Soil Mechanics Laboratory; Surveying Practices; Surveying Practices Laboratory; Structural Analysis
- **CIVIL sem 5**
  - 3 theory courses (expected 4 to 9)
  - no course code printed (6): Hydrology and Water Resources Engineering; Hydrology and Water Resources Engineering laboratory; Foundations and Geotechnical Applications; Foundations and Geotechnical Application Laboratory; Design of RCC Structures; Computer Aided Design Drawing Laboratory - I
- **CIVIL sem 6**
  - 3 theory courses (expected 4 to 9)
  - no course code printed (6): DESIGN OF STEEL STRUCTURES; COMPUTER AIDED DESIGN DRAWING LABORATORY - II; Environmental Engineering; Environmental Engineering (Laboratory); Highway and Traffic Engineering; Highway and Traffic Engineering Laboratory
- **CIVIL sem 7**
  - 3 theory courses (expected 4 to 9)
  - no course code printed (4): Estimation Costing and Valuation; Project Management; Project Management Laboratory; Earthquake Engineering
- **CIVIL sem 8**
  - 0 theory courses (expected 4 to 9)
- **COMP sem 2**
  - no course code printed (1): Engineering Graphics - Laboratory
- **COMP sem 6**
  - 15 theory courses (expected 4 to 9)
- **COMP sem 7**
  - 15 theory courses (expected 4 to 9)
- **COMP sem 8**
  - no courses found
- **ECE sem 1**
  - no course code printed (9): Mathematics – I; Applied Physics; Applied Physics Laboratory; ENVIRONMENTAL SCIENCE; Workshop Practice; Biology For Engineers; Computer Programming – I; Computer Programming – I Laboratory; Universal Human Values
- **ECE sem 2**
  - no course code printed (6): Mathematics – II; Engineering Chemistry; Elements of Electrical and Electronics Engineering; Engineering Graphics - Laboratory; Computer Programming-II; Computer Programming-II Laboratory
- **ECE sem 3**
  - 3 theory courses (expected 4 to 9)
  - no course code printed (3): Electronics Devices and Circuits; Electronics Devices and Circuits Lab; Networks and Systems
- **ECE sem 4**
  - no course code printed (2): Analog Electronics; Analog Electronics Lab
- **ECE sem 5**
  - no course code printed (3): Linear Integrated Circuits and Applications; Linear Integrated Circuits and Applications Lab; Digital Communication Lab
- **ECE sem 6**
  - 11 theory courses (expected 4 to 9)
  - no course code printed (5): Microwave and Antennas Engineering; Information Theory and Coding; Database Management Systems; Power Electronics; Analog IC Design
- **ECE sem 7**
  - 11 theory courses (expected 4 to 9)
  - no course code printed (7): Modern Wireless Communication Lab; Digital CMOS VLSI Design; Digital CMOS VLSI Design Lab; IC Technology; Radar and Navigation systems; Internet of Things; Mixed Signal VLSI Design
- **ECE sem 8**
  - no courses found
- **ELEC sem 1**
  - 1 theory courses (expected 4 to 9)
- **ELEC sem 2**
  - no courses found
- **ELEC sem 5**
  - 10 theory courses (expected 4 to 9)
- **ELEC sem 8**
  - 0 theory courses (expected 4 to 9)
- **ICT sem 1**
  - 1 theory courses (expected 4 to 9)
- **ICT sem 2**
  - 2 theory courses (expected 4 to 9)
- **ICT sem 3**
  - no course code printed (3): Data Structures and Algorithms; Data Structures and Algorithms Laboratory; Electronic Devices and Circuits
- **ICT sem 4**
  - no course code printed (5): Database Management Systems; Database Management Systems Laboratory; Principles of Programming Languages; Principles of Programming Languages Laboratory; Fundamentals of Signal Processing and Communication
- **ICT sem 5**
  - no course code printed (4): Theory of Computation and Compiler Design; Theory of Computation and Compiler Design Laboratory; Optimization Methods and Algorithms; Problem solving through Java
- **ICT sem 6**
  - no course code printed (2): Machine Learning; Statistical Signal Processing
- **ICT sem 7**
  - no course code printed (6): Software Engineering Methodologies; Software Engineering Methodologies Laboratory; Digital CMOS and VLSI Design Lab; Optical Communication; Internet of Things; BLOCKCHAIN TECHNOLOGY
- **ICT sem 8**
  - no courses found
- **MECH sem 7**
  - 12 theory courses (expected 4 to 9)
- **MECH sem 8**
  - no courses found
- **PETRO sem 8**
  - 0 theory courses (expected 4 to 9)

## Notes (handled automatically; lines about L-T-P are worth a human check)

- **BIOTECH sem 1:** p2: 24HS101T starts mid-page (page shared)
- **BIOTECH sem 2:** p2: 24HS105T starts mid-page (page shared)
- **BIOTECH sem 8:** p1: 24PRBT453 starts mid-page (page shared)
- **CIVIL sem 3:** p6: Building Planning and Computer Aided Drawing Lab: named a lab but L-T-P is 1-0-2
- **CIVIL sem 7:** p5: Project Management Laboratory: named a lab but L-T-P is 3-0-2
- **COMP sem 3:** p7: 24CS203T starts mid-page (page shared)
- **COMP sem 6:** p14: 24CS336T starts mid-page (page shared); p15: 24CS341T starts mid-page (page shared)
- **COMP sem 7:** p10: 24CS403T starts mid-page (page shared)
- **ELEC sem 5:** p13: 20EE306T starts mid-page (page shared)
- **ELEC sem 7:** p4: 20EE402T starts mid-page (page shared)
- **ELEC sem 8:** p4: 20EE420 starts mid-page (page shared)
- **ICT sem 2:** p6: 24EE101P starts mid-page (page shared)
- **ICT sem 4:** p4: Database Management Systems Laboratory starts mid-page (page shared)
- **MECH sem 2:** p6: 24CP102P: named a lab but L-T-P is 1-0-0
- **MECH sem 4:** p4: 24ME206T: L-T-P 0-0-2 but a separate lab exists: kept as theory
- **MECH sem 7:** p12: heading of 24ME440T repeated, kept as one course

## Courses found

### BIOTECH sem 1 (Biotech_Semester_1_Course_Handout.pdf)

| Pages | Code     | Title                               | Kind   |
| ----- | -------- | ----------------------------------- | ------ |
| 2     | 24HS101T | English Communication               | theory |
| 3     | 24MA102T | Mathematics for Biotechnology – I   | theory |
| 4     | 24CP101T | Computer Programming – I            | theory |
| 5     | 24CP101P | Computer Programming Laboratory – I | lab    |
| 6     | 24PH103T | Modern Physics                      | theory |
| 7     | 24PH103P | Modern Physics Laboratory           | lab    |
| 8     | 24CV101T | Environmental Science               | theory |
| 9     | 24ME101P | Workshop Practices                  | lab    |
| 10    | 24ME102P | Engineering Graphics                | lab    |
| 11    | 24HS102T | Universal Human Values              | theory |
| 12    | 24BT102T | Biology For Engineers               | theory |

### BIOTECH sem 2 (Biotech_Semester_2_Course_Handout.pdf)

| Pages | Code     | Title                                                         | Kind   |
| ----- | -------- | ------------------------------------------------------------- | ------ |
| 2     | 24HS105T | Professional Communication                                    | theory |
| 3     | 24MA104T | Mathematics for Biotechnology – II                            | theory |
| 4     | 24CP102T | Computer Programming – II                                     | theory |
| 5     | 24CP102P | Computer Programming Laboratory – II                          | lab    |
| 6     | 24CH101T | Engineering Chemistry                                         | theory |
| 7     | 24CH101P | Engineering Chemistry Laboratory                              | lab    |
| 8     | 24EE101T | Elements of Electrical and Electronics Engineering            | theory |
| 9     | 24EE101P | Elements of Electrical and Electronics Engineering Laboratory | lab    |
| 10    | 24HS103T | Indian Knowledge System                                       | theory |
| 11    | 24YOG101 | Yoga, Health & Hygiene                                        | other  |
| 12    | 24NSS101 | National Service Scheme (NSS)                                 | other  |
| 13    | 24NCC101 | National Cadet Corps (NCC)                                    | other  |
| 14    | 24HS104T | Organizational Behaviour                                      | theory |

### BIOTECH sem 3 (Biotech_Semester_3_Course_Handout.pdf)

| Pages | Code     | Title                                   | Kind   |
| ----- | -------- | --------------------------------------- | ------ |
| 2     | 24BT201T | Biophysics and Structural Biology       | theory |
| 3     | 24BT202T | Introduction to Artificial Intelligence | theory |
| 4     | 24BT203T | Principles of Biochemistry              | theory |
| 5     | 24BT203P | Principles of Biochemistry Laboratory   | lab    |
| 6     | 24BT204T | Human Anatomy and physiology -I         | theory |
| 7     | 24BT204P | Human Anatomy and physiology Lab -I     | lab    |
| 8     | 24BT205T | General Microbiology                    | theory |
| 9     | 24BT205T | General Microbiology Lab                | lab    |

### BIOTECH sem 4 (Biotech_Semester_4_Course_Handout.pdf)

| Pages | Code     | Title                                   | Kind   |
| ----- | -------- | --------------------------------------- | ------ |
| 2     | 24BT207T | Molecular Biology and Genetics          | theory |
| 3     | 24BT207P | Molecular Biology & Genetics Laboratory | lab    |
| 4     | 24BT208T | Bioprocess Engineering                  | theory |
| 5     | 24BT208P | Bioprocess Engineering Lab              | lab    |
| 6     | 24BT209T | Human Anatomy and physiology -II        | theory |
| 7     | 24BT209P | Human Anatomy and physiology Lab -II    | lab    |
| 8     | 24BT210T | Analytical Bioinformatics               | theory |
| 9     | 24BT210P | Analytical Bioinformatics Lab           | lab    |
| 10    | 24BT221T | Biomedical Informatics                  | theory |

### BIOTECH sem 5 (Biotech_Semester_5_Course_Handout.pdf)

| Pages | Code      | Title                                       | Kind   |
| ----- | --------- | ------------------------------------------- | ------ |
| 2     | 24BT331T  | Medical Diagnostics                         | theory |
| 3     | 24BT332T  | Green Biotechnology and Pollution Abatement | theory |
| 4     | 24BT333T  | Computer Aided Drug Design                  | theory |
| 5     | 24BT301T  | Genomics and Proteomics                     | theory |
| 6     | 24BT301TP | Genomics and Proteomics Lab                 | lab    |
| 7     | 24BT302T  | Immunology and Immunotechnology             | theory |
| 8     | 24BT302P  | Immunology and Immunotechnology Laboratory  | lab    |
| 9     | 24BT303T  | Animal and Plant Biotechnology              | theory |
| 10    | 24BT303P  | Animal and Plant Biotechnology Lab          | lab    |

### BIOTECH sem 6 (Biotech_Semester_6_Course_Handout.pdf)

| Pages | Code     | Title                                            | Kind   |
| ----- | -------- | ------------------------------------------------ | ------ |
| 2     | 24BT321T | Molecular Diagnostics                            | theory |
| 3     | 24BT334T | Biomaterial & Implants                           | theory |
| 4     | 24BT335T | Novel Separation Processes – Dyes and Pigments   | theory |
| 5     | 24BT336T | Cheminformatics & Medicinal Chemistry            | theory |
| 6     | 24BT337T | Pharmacokinetics & Pharmacodynamics              | theory |
| 7-8   | 24BT338T | Food Biotechnology                               | theory |
| 9     | 24BT339T | Next Generation Sequence Analysis                | theory |
| 10    | 24BT304T | Genetic Engineering Techniques                   | theory |
| 11    | 24BT304P | Genetic Engineering Laboratory                   | lab    |
| 12    | 24BT305T | Tissue Engineering & Regenerative Medicine       | theory |
| 13    | 24BT305P | Tissue Engineering and Regenerative Medicine Lab | lab    |
| 14    | 24BT306T | Pharmacology of Drug Action                      | theory |
| 15    | 24BT306P | Pharmacology of Drug Action Laboratory           | lab    |

### BIOTECH sem 7 (Biotech_Semester_7_Course_Handout.pdf)

| Pages | Code      | Title                                   | Kind   |
| ----- | --------- | --------------------------------------- | ------ |
| 2-4   | 24INT451  | Summer Internship                       | other  |
| 5     | 24BT421T  | BIOSIMILARS TECHNOLOGY                  | theory |
| 6-7   | 24BT431T  | Pharmaceutical Biotechnology            | theory |
| 8-9   | 24BT432T  | Synthetic and Systems Biology           | theory |
| 10    | 24BT433T  | Metabolic Engineering                   | theory |
| 11-12 | 24BT434T  | Biomass Conversion and Utilization      | theory |
| 13    | 24BT435T  | Stem Cell Technology                    | theory |
| 14    | 24BT436T  | Molecular Data Analysis and Simulations | theory |
| 15    | 24BT401T  | Bioethics, IPR and Biosafety            | theory |
| 16    | 24BT402T  | Nanotechnology                          | theory |
| 17    | 24BT402P  | Nanotechnology lab                      | lab    |
| 18    | 24BT403T  | Downstream Processing                   | theory |
| 19    | 24BT403P  | Downstream processing lab               | lab    |
| 20-21 | 24PRBT451 | Seminars                                | other  |

### BIOTECH sem 8 (Biotech_Semester_8_Course_Handout.pdf)

| Pages | Code      | Title                                                       | Kind  |
| ----- | --------- | ----------------------------------------------------------- | ----- |
| 1-2   | 24PRBT453 | Comprehensive Project Major Project 24PRBT452 Major Project | other |

### CHEM sem 1 (Chemical_Semester_1_Course_Handout.pdf)

| Pages | Code     | Title                                                         | Kind   |
| ----- | -------- | ------------------------------------------------------------- | ------ |
| 2     | 24MA101T | Mathematics - I                                               | theory |
| 3     | 24HS101T | English Communication                                         | theory |
| 4     | 24CP101T | Computer Programming - I                                      | theory |
| 5     | 24CP101P | Computer Programming - I Laboratory                           | lab    |
| 6     | 24CH101T | Engineering Chemistry                                         | theory |
| 7     | 24CH101P | Engineering Chemistry Laboratory                              | lab    |
| 8     | 24EE101T | Elements of Electrical and Electronics Engineering            | theory |
| 9     | 24EE101P | Elements of Electrical and Electronics Engineering Laboratory | lab    |
| 10    | 24BT101T | Biological Systems for Engineers                              | theory |
| 11    | 24HS104T | Organizational Behaviour                                      | theory |
| 12    | 24YOG101 | Yog, Health & Hygiene                                         | other  |
| 13    | 24NSS101 | National Service Scheme (NSS)                                 | other  |
| 14    | 24NCC101 | National Cadet Corps (NCC)                                    | other  |

### CHEM sem 2 (Chemical_Semester_2_Course_Handout.pdf)

| Pages | Code     | Title                                | Kind   |
| ----- | -------- | ------------------------------------ | ------ |
| 2     | 24HS105T | Professional Communication           | theory |
| 3     | 24MA103T | Mathematics - II                     | theory |
| 4     | 24CP102T | Computer Programming - II            | theory |
| 5     | 24CP102P | Computer Programming - II Laboratory | lab    |
| 6     | 24PH103T | Modern Physics                       | theory |
| 7     | 24PH103P | Modern Physics Laboratory            | lab    |
| 8     | 24ME101P | Workshop Practices                   | lab    |
| 9     | 24ME102P | Engineering Graphics                 | lab    |
| 10    | 24CV101T | Environmental Science                | theory |
| 11    | 24HS102T | Universal Human Values               | theory |
| 12    | 24HS103T | Indian Knowledge System              | theory |

### CHEM sem 3 (Chemical_Semester_3_Course_Handout.pdf)

| Pages | Code      | Title                                   | Kind   |
| ----- | --------- | --------------------------------------- | ------ |
| 2     | 24INT151T | Civic and Social Service Internship     | other  |
| 3     | 24MA201T  | Mathematics - III                       | theory |
| 4     | 24CH202T  | Introduction to Artificial Intelligence | theory |
| 5     | 24CH203T  | Chemical Process Calculations           | theory |
| 6     | 24CH204T  | Mechanical Unit Operations              | theory |
| 7     | 24CH204P  | Mechanical Unit Operations Laboratory   | lab    |
| 8     | 24CH205T  | Fluid Mechanics                         | theory |
| 9     | 24CH205P  | Fluid Mechanics Laboratory              | lab    |

### CHEM sem 4 (Chemical_Semester_4_Course_Handout.pdf)

| Pages | Code      | Title                                                    | Kind   |
| ----- | --------- | -------------------------------------------------------- | ------ |
| 2     | 24INT251T | Industrial Orientation                                   | other  |
| 3     | 24CH206T  | Chemical Engineering Industry 4.0                        | theory |
| 4     | 24CH206P  | Chemical Engineering Industry 4.0 Laboratory             | lab    |
| 5     | 24CH207T  | Heat Transfer                                            | theory |
| 6     | 24CH207P  | Heat Transfer Laboratory                                 | lab    |
| 7     | 24CH208T  | Chemical Process Technology                              | theory |
| 8     | 24CH208P  | Chemical Process Technology Laboratory                   | lab    |
| 9     | 24CH209T  | Introduction to Numerical Methods for Chemical Engineers | theory |
| 10    | 24CH210T  | Chemical Engineering Thermodynamics                      | theory |
| 11    | 24CH210P  | Chemical Engineering Thermodynamics Laboratory           | lab    |

### CHEM sem 5 (Chemical_Semester_5_Course_Handout.pdf)

| Pages | Code     | Title                                        | Kind   |
| ----- | -------- | -------------------------------------------- | ------ |
| 2     | 24HS301T | Engineering Economics                        | theory |
| 3     | 24CH301T | Mass Transfer - 1                            | theory |
| 4     | 24CH301P | Mass Transfer - 1 Laboratory                 | lab    |
| 5     | 24CH302T | Chemical Reaction Engineering - 1            | theory |
| 6     | 24CH302P | Chemical Reaction Engineering - 1 Laboratory | lab    |
| 7     | 24CH303T | Process Equipment Design                     | theory |
| 8     | 24CH303P | Process Equipment Design Laboratory          | lab    |
| 9     | 24CH331T | Petroleum Refining and Petrochemicals        | theory |
| 10    | 24CH332T | Renewable Energy Engineering                 | theory |
| 11    | 24CH333T | Sustainable and Green Chemistry              | theory |

### CHEM sem 6 (Chemical_Semester_6_Course_Handout.pdf)

| Pages | Code     | Title                                           | Kind   |
| ----- | -------- | ----------------------------------------------- | ------ |
| 2     | 24CH304T | Instrumentation and Process Control             | theory |
| 3     | 24CH304P | Instrumentation and Process Control Laboratory  | lab    |
| 4     | 24CH305T | Chemical Reaction Engineering - 2               | theory |
| 5     | 24CH305P | Chemical Reaction Engineering - 2 Laboratory    | lab    |
| 6     | 24CH306T | Mass Transfer - 2                               | theory |
| 7     | 24CH306P | Mass Transfer - 2 Laboratory                    | lab    |
| 8     | 24CH334T | Piping Design                                   | theory |
| 9     | 24CH335T | Corrosion Engineering                           | theory |
| 10    | 24CH336T | Material Science & Engineering                  | theory |
| 11    | 24CH337T | Nano Technology & Energy Storage                | theory |
| 12    | 24CH338T | Membrane Processes                              | theory |
| 13    | 24CH339T | Environmental Engineering and Pollution Control | theory |

### CHEM sem 7 (Chemical_Semester_7_Course_Handout.pdf)

| Pages | Code       | Title                                         | Kind   |
| ----- | ---------- | --------------------------------------------- | ------ |
| 2     | 24INT451T  | Summer Internship                             | other  |
| 3     | 24CH401T   | Process Modelling and Optimization            | theory |
| 4     | 24CH401P   | Process Modelling and Optimization Laboratory | lab    |
| 5     | 24CH402T   | Transport Phenomena                           | theory |
| 6     | 24CH403T   | Computer Aided Process Design                 | theory |
| 7     | 24CH403P   | Computer Aided Process Design Laboratory      | lab    |
| 8     | 24CH431T   | Polymer Science & Technology                  | theory |
| 9     | 24CH432T   | Energy Conversion Device Engineering          | theory |
| 10    | 24CH433T   | Pharmaceuticals Technology                    | theory |
| 11    | 24CH434T   | Process Plant Safety, Health and Hygiene      | theory |
| 12    | 24CH435T   | Project Management                            | theory |
| 13    | 24CH436T   | Plant Design & Process Economics              | theory |
| 14    | 24PRCH451T | Seminar                                       | other  |

### CHEM sem 8 (Chemical_Semester_8_Course_Handout.pdf)

| Pages | Code       | Title                 | Kind  |
| ----- | ---------- | --------------------- | ----- |
| 2     | 24PRCH452T | Major Project         | other |
| 3     | 24PRCH453T | Comprehensive Project | other |

### CIVIL sem 1 (Civil_Semester_1_Course_Handout.pdf)

| Pages | Code | Title                                                                   | Kind   |
| ----- | ---- | ----------------------------------------------------------------------- | ------ |
| 2     | ?    | Mathematics – I                                                         | theory |
| 3     | ?    | Physics                                                                 | theory |
| 4     | ?    | Physics Laboratory                                                      | lab    |
| 5     | ?    | ENVIRONMENTAL SCIENCE                                                   | theory |
| 6     | ?    | Workshop Practice                                                       | lab    |
| 7     | ?    | Biology For Engineers                                                   | theory |
| 8     | ?    | Introduction to Computer Programming -I (For ME/CH/CL/BT)               | theory |
| 9     | ?    | Introduction to Computer Programming -I Laboratory (For ME, CL, CH, BT) | lab    |
| 10    | ?    | Universal Human Values                                                  | theory |

### CIVIL sem 2 (Civil_Semester_2_Course_Handout.pdf)

| Pages | Code | Title                                                                | Kind   |
| ----- | ---- | -------------------------------------------------------------------- | ------ |
| 2     | ?    | Mathematics – II                                                     | theory |
| 3     | ?    | Engineering Chemistry                                                | theory |
| 4     | ?    | Engineering Chemistry Laboratory                                     | lab    |
| 5     | ?    | Elements of Electrical and Electronics Engineering                   | theory |
| 6     | ?    | Elements of Electrical and Electronics Engineering Laboratory        | lab    |
| 7     | ?    | Engineering Graphics - Laboratory                                    | lab    |
| 8     | ?    | Intoduction to Computer Programming II (For ME/CL/CH/BT)             | theory |
| 9     | ?    | Introduction to Computer Programming II Laboratory (For ME/CL/CH/BT) | lab    |

### CIVIL sem 3 (Civil_Semester_3_Course_Handout.pdf)

| Pages | Code | Title                                            | Kind   |
| ----- | ---- | ------------------------------------------------ | ------ |
| 2     | ?    | Mathematics – III                                | theory |
| 3     | ?    | Introduction to Artificial Intelligence          | theory |
| 4     | ?    | Building Materials and Construction              | theory |
| 5     | ?    | Building Planning and Computer Aided Drawing     | theory |
| 6     | ?    | Building Planning and Computer Aided Drawing Lab | lab    |
| 7     | ?    | Solid Mechanics                                  | theory |
| 8     | ?    | Concrete Technology                              | theory |
| 9     | ?    | Material Testing Laboratory                      | lab    |

### CIVIL sem 4 (Civil_Semester_4_Course_Handout.pdf)

| Pages | Code | Title                                             | Kind   |
| ----- | ---- | ------------------------------------------------- | ------ |
| 2     | ?    | Industry 4.0                                      | theory |
| 3     | ?    | Industry 4.0 Laboratory                           | lab    |
| 4     | ?    | Fluid Mechanics                                   | theory |
| 5     | ?    | Fluid Mechanics Laboratory                        | lab    |
| 6     | ?    | Engineering Geology and Soil Mechanics            | theory |
| 7     | ?    | Engineering Geology and Soil Mechanics Laboratory | lab    |
| 8     | ?    | Surveying Practices                               | theory |
| 9     | ?    | Surveying Practices Laboratory                    | lab    |
| 10    | ?    | Structural Analysis                               | theory |

### CIVIL sem 5 (Civil_Semester_5_Course_Handout.pdf)

| Pages | Code | Title                                                | Kind   |
| ----- | ---- | ---------------------------------------------------- | ------ |
| 2     | ?    | Hydrology and Water Resources Engineering            | theory |
| 3     | ?    | Hydrology and Water Resources Engineering laboratory | lab    |
| 4     | ?    | Foundations and Geotechnical Applications            | theory |
| 5     | ?    | Foundations and Geotechnical Application Laboratory  | lab    |
| 6-7   | ?    | Design of RCC Structures                             | theory |
| 8     | ?    | Computer Aided Design Drawing Laboratory - I         | lab    |

### CIVIL sem 6 (Civil_Semester_6_Course_Handout.pdf)

| Pages | Code | Title                                         | Kind   |
| ----- | ---- | --------------------------------------------- | ------ |
| 2     | ?    | DESIGN OF STEEL STRUCTURES                    | theory |
| 3     | ?    | COMPUTER AIDED DESIGN DRAWING LABORATORY - II | lab    |
| 4     | ?    | Environmental Engineering                     | theory |
| 5     | ?    | Environmental Engineering (Laboratory)        | lab    |
| 6     | ?    | Highway and Traffic Engineering               | theory |
| 7     | ?    | Highway and Traffic Engineering Laboratory    | lab    |

### CIVIL sem 7 (Civil_Semester_7_Course_Handout.pdf)

| Pages | Code | Title                            | Kind   |
| ----- | ---- | -------------------------------- | ------ |
| 3     | ?    | Estimation Costing and Valuation | theory |
| 4     | ?    | Project Management               | theory |
| 5     | ?    | Project Management Laboratory    | lab    |
| 6     | ?    | Earthquake Engineering           | theory |

### CIVIL sem 8 (Civil_Semester_8_Course_Handout.pdf)

| Pages | Code | Title                 | Kind  |
| ----- | ---- | --------------------- | ----- |
| 2     | ?    | Major Project         | other |
| 3     | ?    | Comprehensive Project | other |

### COMP sem 1 (CE_Semester_1_Course_Handout.pdf)

| Pages | Code     | Title                                             | Kind   |
| ----- | -------- | ------------------------------------------------- | ------ |
| 3     | 24HS101T | English Communication                             | theory |
| 4     | 24MA101T | Mathematics – I                                   | theory |
| 5     | 24PH101T | Applied Physics (For CS, ICT, ECE, EE)            | theory |
| 6     | 24PH101P | Applied Physics Laboratory (For CS, ICT, ECE, EE) | lab    |
| 7     | 24CV101T | ENVIRONMENTAL SCIENCE                             | theory |
| 8     | 24ME101T | Workshop Practice                                 | lab    |
| 9     | 24BT101T | Biological Systems for Engineers                  | theory |
| 10    | 24CP101T | Computer Programming-I                            | theory |
| 11    | 24CP101P | Computer Programming – I Laboratory               | lab    |
| 12    | 24HS102T | Universal Human Values                            | theory |

### COMP sem 2 (CE_Semester_2_Course_Handout.pdf)

| Pages | Code     | Title                                                         | Kind   |
| ----- | -------- | ------------------------------------------------------------- | ------ |
| 3     | 24HS105T | Professional Communication                                    | theory |
| 4     | 24MA103T | Mathematics – II                                              | theory |
| 5     | 24CH101T | Engineering Chemistry                                         | theory |
| 6     | 20CH101P | Engineering Chemistry Practical                               | lab    |
| 7     | 24EE101T | Elements of Electrical and Electronics Engineering            | theory |
| 8     | 24EE101P | Elements of Electrical and Electronics Engineering Laboratory | lab    |
| 9     | ?        | Engineering Graphics - Laboratory                             | lab    |
| 10    | 24PH101T | Yoga, Health & Hygiene                                        | other  |
| 11    | 24PH102T | National Service Scheme (NSS)                                 | other  |
| 12    | 24PH103T | National Cadet Corps (NCC)                                    | other  |
| 13    | 24CP102T | Computer Programming-II                                       | theory |
| 14    | 24CP102P | Computer Programming-II Laboratory                            | lab    |
| 15    | 24HS104T | Organizational Behavior                                       | theory |

### COMP sem 3 (CE_Semester_3_Course_Handout.pdf)

| Pages | Code     | Title                                            | Kind   |
| ----- | -------- | ------------------------------------------------ | ------ |
| 3     | 24MA202T | Discrete Mathematical Structures (For CS, ICT)   | theory |
| 4     | 24CS202T | Database Management Systems                      | theory |
| 5     | 24CS202P | Database Management Systems Laboratory           | lab    |
| 6-7   | 24CS201T | Digital Logic and Design                         | theory |
| 7     | 24CS203T | Data Structures                                  | theory |
| 8     | 24CS203P | Data Structures Laboratory                       | lab    |
| 9     | 24CS204T | Object Oriented Programming Paradigms            | theory |
| 10    | 24CS204P | Object Oriented Programming Paradigms Laboratory | lab    |

### COMP sem 4 (CE_Semester_4_Course_Handout.pdf)

| Pages | Code     | Title                                        | Kind   |
| ----- | -------- | -------------------------------------------- | ------ |
| 3     | 24CS221T | Open Source Technologies                     | theory |
| 4     | 24CS222T | Introduction to Data Science                 | theory |
| 5     | 24CS205T | Design Thinking Laboratory                   | lab    |
| 6     | 24CS206T | Probability and Statistics                   | theory |
| 7-8   | 24CS207T | Computer Organization and Architecture       | theory |
| 9     | 24CS209T | Software Engineering                         | theory |
| 10    | 24CS209P | Software Engineering Laboratory              | lab    |
| 11-12 | 24CS208T | Theory of Computation                        | theory |
| 13    | 24CS210T | Design and Analysis of Algorithms            | theory |
| 14    | 24CS210P | Design and Analysis of Algorithms Laboratory | lab    |

### COMP sem 5 (CE_Semester_5_Course_Handout.pdf)

| Pages | Code     | Title                                   | Kind   |
| ----- | -------- | --------------------------------------- | ------ |
| 4     | 24CS301T | Introduction to Artificial Intelligence | theory |
| 5     | 24CS302T | Computer Networks                       | theory |
| 6     | 24CS302P | Computer Networks Laboratory            | lab    |
| 7     | 24CS303T | Compiler Design                         | theory |
| 8     | 24CS303P | Compiler Design Laboratory              | lab    |
| 9     | 24CS304T | Operating System                        | theory |
| 10-11 | 24CS304P | Operating System Laboratory             | lab    |
| 12-13 | 24CS331T | Data Warehousing and Data Mining        | theory |
| 14-15 | 24CS332T | Object Oriented Modelling and Design    | theory |
| 16-17 | 24CS333T | Computer Graphics                       | theory |
| 18-19 | 24CS335T | Advanced Data Structures and Algorithms | theory |
| 20    | 24CS334T | Data Communication                      | theory |

### COMP sem 6 (CE_Semester_6_Course_Handout.pdf)

| Pages | Code     | Title                                            | Kind   |
| ----- | -------- | ------------------------------------------------ | ------ |
| 4     | 24CS321T | Web Development                                  | theory |
| 5     | 24CS322T | Object Oriented Programming & Design             | theory |
| 6     | 24CS305T | Cryptography and Network Security                | theory |
| 7     | 24CS305P | Cryptography and Network Security Laboratory     | lab    |
| 8     | 24CS306T | Web and Mobile Development Essentials            | theory |
| 9     | 24CS306P | Web and Mobile Development Essentials Laboratory | lab    |
| 10-11 | 24CS307T | Distributed Computing                            | theory |
| 12-14 | 24CS307P | Distributed Computing Laboratory                 | lab    |
| 14-15 | 24CS336T | Soft Computing                                   | theory |
| 15-16 | 24CS341T | Deep learning                                    | theory |
| 17    | 24CS337T | UI/UX Design                                     | theory |
| 18-19 | 24CS342T | Secure System Engineering                        | theory |
| 20    | 24CS338T | Digital Image Processing                         | theory |
| 21-22 | 24CS343T | Computer Vision                                  | theory |
| 23    | 24CS339T | Blockchain Technology                            | theory |
| 24-25 | 24CS344T | Big Data Analytics                               | theory |
| 26    | 24CS340T | Mobile Computing                                 | theory |
| 27    | 24CS345T | Wireless Sensor Networks                         | theory |

### COMP sem 7 (CE_Semester_7_Course_Handout.pdf)

| Pages | Code     | Title                                     | Kind   |
| ----- | -------- | ----------------------------------------- | ------ |
| 4     | 24CS422T | Global Data Security and Privacy Laws     | theory |
| 5     | 24CS421T | Green IT                                  | theory |
| 6     | 24CS401T | Industry 4.0                              | theory |
| 7     | 24CS401P | Industry 4.0 Laboratory                   | lab    |
| 8     | 24CS402T | Machine Learning                          | theory |
| 9-10  | 24CS402P | Machine Learning Laboratory               | lab    |
| 10-11 | 24CS403T | Cyber Laws and Ethics                     | theory |
| 12    | 24CS431T | Agent-based Learning                      | theory |
| 13-14 | 24CS436T | Machine Learning for Cyber Security       | theory |
| 15    | 24CS432T | Agile and DevOps                          | theory |
| 16-17 | 24CS437T | Web Testing                               | theory |
| 18    | 24CS433T | Natural Language Processing               | theory |
| 19-20 | 24CS438T | Fundamental Concepts of Speech Processing | theory |
| 21    | 24CS434T | Cloud Computing                           | theory |
| 22-23 | 24CS439T | Quantum Computing                         | theory |
| 24    | 24CS435T | Internet of Things                        | theory |
| 25    | 24CS440T | Autonomous System                         | theory |

### COMP sem 8 (CE_Semester_8_Course_Handout.pdf)

No course handouts found in this PDF.

### ECE sem 1 (ECE_Semester_1_Course_Handout.pdf)

| Pages | Code | Title                               | Kind   |
| ----- | ---- | ----------------------------------- | ------ |
| 3     | ?    | Mathematics – I                     | theory |
| 4     | ?    | Applied Physics                     | theory |
| 5     | ?    | Applied Physics Laboratory          | lab    |
| 6     | ?    | ENVIRONMENTAL SCIENCE               | theory |
| 7     | ?    | Workshop Practice                   | lab    |
| 8     | ?    | Biology For Engineers               | theory |
| 9     | ?    | Computer Programming – I            | theory |
| 10    | ?    | Computer Programming – I Laboratory | lab    |
| 11    | ?    | Universal Human Values              | theory |

### ECE sem 2 (ECE_Semester_2_Course_Handout.pdf)

| Pages | Code     | Title                                                         | Kind   |
| ----- | -------- | ------------------------------------------------------------- | ------ |
| 3     | ?        | Mathematics – II                                              | theory |
| 4     | ?        | Engineering Chemistry                                         | theory |
| 5     | 20CH101P | Engineering Chemistry Practical                               | lab    |
| 6     | ?        | Elements of Electrical and Electronics Engineering            | theory |
| 7     | 24EE101P | Elements of Electrical and Electronics Engineering Laboratory | lab    |
| 8     | ?        | Engineering Graphics - Laboratory                             | lab    |
| 9     | ?        | Yoga, Health & Hygiene                                        | other  |
| 10    | ?        | National Service Scheme (NSS)                                 | other  |
| 11    | ?        | National Cadet Corps (NCC)                                    | other  |
| 12    | ?        | Computer Programming-II                                       | theory |
| 13    | ?        | Computer Programming-II Laboratory                            | lab    |

### ECE sem 3 (ECE_Semester_3_Course_Handout.pdf)

| Pages | Code      | Title                                | Kind   |
| ----- | --------- | ------------------------------------ | ------ |
| 3     | 24ICXXXT  | Digital Circuits                     | theory |
| 4     | 20ECEXXXP | Digital Circuits Lab                 | lab    |
| 5     | ?         | Electronics Devices and Circuits     | theory |
| 6     | ?         | Electronics Devices and Circuits Lab | lab    |
| 7     | ?         | Networks and Systems                 | theory |

### ECE sem 4 (ECE_Semester_4_Course_Handout.pdf)

| Pages | Code      | Title                                   | Kind   |
| ----- | --------- | --------------------------------------- | ------ |
| 3     | ?         | Analog Electronics                      | theory |
| 4     | ?         | Analog Electronics Lab                  | lab    |
| 5     | 24ECE***T | Analog Communication                    | theory |
| 6     | 24ECE***P | Analog Communication Lab                | lab    |
| 7-8   | 20ECE201T | Electromagnetics and Transmission Lines | theory |
| 9     | 24ECE***T | Digital Signal Processing               | theory |
| 10    | 24ECE***P | Digital Signal Processing Lab           | lab    |

### ECE sem 5 (ECE_Semester_5_Course_Handout.pdf)

| Pages | Code      | Title                                           | Kind   |
| ----- | --------- | ----------------------------------------------- | ------ |
| 5     | ?         | Linear Integrated Circuits and Applications     | theory |
| 6     | ?         | Linear Integrated Circuits and Applications Lab | lab    |
| 7     | 24ICXXXT  | Digital Communication                           | theory |
| 8     | ?         | Digital Communication Lab                       | lab    |
| 9     | 20ECE309T | Control Systems                                 | theory |
| 10-12 | 20ECEXXXP | Control Systems Laboratory                      | lab    |
| 13    | 20ECE305T | Optoelectronics and Optical Communication       | theory |
| 14    | 24XXXXXX  | Digital Systems Design Using HDL                | theory |

### ECE sem 6 (ECE_Semester_6_Course_Handout.pdf)

| Pages | Code      | Title                                        | Kind   |
| ----- | --------- | -------------------------------------------- | ------ |
| 4     | 24ECE***T | Computer Communication and Networking        | theory |
| 5     | 24ECE***P | Computer Communication and Networking Lab    | lab    |
| 6-7   | 24ICXXXT  | Computer Organization and Microprocessor     | theory |
| 8     | 24ICXXXP  | Computer Organization and Microprocessor Lab | lab    |
| 9     | ?         | Microwave and Antennas Engineering           | theory |
| 10-12 | 24ICTXXXP | Microwave and Antenna Engineering Lab        | lab    |
| 13    | 24ECEXXXX | Machine Learning and Applications            | theory |
| 14    | ?         | Information Theory and Coding                | theory |
| 15    | ?         | Database Management Systems                  | theory |
| 16    | 24ECEXXXT | Introduction to Robotics                     | theory |
| 17    | 24ICXXXT  | Satellite Communication                      | theory |
| 18-19 | 23ECE305T | Modern Control Systems                       | theory |
| 20    | ?         | Power Electronics                            | theory |
| 21    | ?         | Analog IC Design                             | theory |

### ECE sem 7 (ECE_Semester_7_Course_Handout.pdf)

| Pages | Code      | Title                                   | Kind   |
| ----- | --------- | --------------------------------------- | ------ |
| 4     | 24ICXXXT  | Modern Wireless Communications          | theory |
| 5     | ?         | Modern Wireless Communication Lab       | lab    |
| 6     | 24ICXXXT  | Embedded Systems                        | theory |
| 7     | 24ICXXXP  | Embedded Systems Lab                    | lab    |
| 8     | ?         | Digital CMOS VLSI Design                | theory |
| 9-11  | ?         | Digital CMOS VLSI Design Lab            | lab    |
| 12    | 24ECE***T | Advanced Processors and SoC             | theory |
| 13    | 24ECE***T | Advance Communication Networks          | theory |
| 14    | ?         | IC Technology                           | theory |
| 15    | 24ECEXXXT | Drones: Design, Theory and Applications | theory |
| 16    | ?         | Radar and Navigation systems            | theory |
| 17    | ?         | Internet of Things                      | theory |
| 18    | ?         | Mixed Signal VLSI Design                | theory |
| 19-20 | 24ECXXXT  | Deep Learning and Applications          | theory |

### ECE sem 8 (ECE_Semester_8_Course_Handout.pdf)

No course handouts found in this PDF.

### ELEC sem 1 (Electrical_Semester_1_Course_Handout.pdf)

| Pages | Code     | Title                                         | Kind   |
| ----- | -------- | --------------------------------------------- | ------ |
| 3     | 20EE101T | Elements of Electrical Engineering            | theory |
| 4     | 20EE101P | Elements of Electrical Engineering Laboratory | lab    |

### ELEC sem 2 (Electrical_Semester_2_Course_Handout.pdf)

No course handouts found in this PDF.

### ELEC sem 3 (Electrical_Semester_3_Course_Handout.pdf)

| Pages | Code     | Title                                    | Kind   |
| ----- | -------- | ---------------------------------------- | ------ |
| 3     | 20MA203T | Mathematics - III                        | theory |
| 4     | 20EE201T | NETWORK ANALYSIS                         | theory |
| 5     | 20EE202T | Analog & Digital Electronics             | theory |
| 6     | 20EE202P | Analog & Digital Electronics – Lab.      | lab    |
| 7     | 20EE203T | Transformers & Induction Machines        | theory |
| 8     | 20EE203P | Transformers & Induction Machines – Lab. | lab    |
| 9     | 20HS201P | Communication Skills – II                | lab    |
| 10    | 20EE204T | Climate Change: Impact and Solutions     | theory |

### ELEC sem 4 (Electrical_Semester_4_Course_Handout.pdf)

| Pages | Code     | Title                                                      | Kind   |
| ----- | -------- | ---------------------------------------------------------- | ------ |
| 3     | 20EE205T | Electrical Power Generation, Transmission and Distribution | theory |
| 4     | 20EE206T | Linear Control Theory                                      | theory |
| 5     | 20EE206P | Control Systems Laboratory                                 | lab    |
| 6     | 20EE207T | Synchronous and DC Machines                                | theory |
| 7     | 20EE207P | Synchronous and DC Machines Laboratory                     | lab    |
| 8     | 20EE208T | Microprocessors and Microcontrollers                       | theory |
| 9     | 20EE208P | Microprocessors and Microcontrollers Laboratory            | lab    |
| 10    | 20IF201T | Industry 4.0                                               | theory |
| 11    | 20IF201P | Industry 4.0 Laboratory                                    | lab    |
| 12    | ?        | Industrial Orientation                                     | other  |
| 13    | 20EE209T | Energy and Water Nexus                                     | theory |

### ELEC sem 5 (Electrical_Semester_5_Course_Handout.pdf)

| Pages | Code     | Title                                                    | Kind   |
| ----- | -------- | -------------------------------------------------------- | ------ |
| 3     | 20EE301T | Power System Operations and Control                      | theory |
| 4     | 20EE301P | Power System Simulation Laboratory                       | lab    |
| 5     | 20EE302T | Power Electronic Converters                              | theory |
| 6     | 20EE302P | Power Electronic Converters Laboratory                   | lab    |
| 7     | 20EE303T | Instrumentation and Control                              | theory |
| 8     | 20EE303P | Instrumentation and Control Laboratory                   | lab    |
| 9     | 20EE304T | High Voltage Engineering                                 | theory |
| 10    | 20EE304P | High Voltage Engineering Laboratory                      | lab    |
| 11    | 20EE305T | Digital Signal Processing                                | theory |
| 12-13 | 20EE305P | Digital Signal Processing Laboratory                     | lab    |
| 13    | 20EE306T | Analog and Digital Communication                         | theory |
| 14    | 20EE306P | Analog and Digital Communication Laboratory              | lab    |
| 15    | 20EE307T | Artificial Intelligence in Electrical Systems            | theory |
| 16    | 20EE307P | Artificial Intelligence in Electrical Systems Laboratory | lab    |
| 17    | 20EE308T | Energy Management and Audit                              | theory |
| 18    | 20EE309T | Systems Thinking                                         | theory |
| 19    | 20EE310T | Wind and Solar Energy                                    | theory |
| 20    | 20HS301P | Communication Skills – III                               | lab    |

### ELEC sem 6 (Electrical_Semester_6_Course_Handout.pdf)

| Pages | Code     | Title                                               | Kind   |
| ----- | -------- | --------------------------------------------------- | ------ |
| 3     | 20EE311T | POWER SYSTEM PROTECTION                             | theory |
| 4     | 20EE311P | Power System Protection Laboratory                  | lab    |
| 5     | 20EE312T | Electric Drives                                     | theory |
| 6     | 20EE312P | Electric Drives Laboratory                          | lab    |
| 7     | 20EE313T | Renewable Energy Engineering                        | theory |
| 8     | 20EE313P | Renewable Energy Engineering Laboratory             | lab    |
| 9     | 20EE314T | Advanced Power Electronic Converters                | theory |
| 10    | 20EE314P | Advanced Power Electronic Converters Laboratory     | lab    |
| 11    | 20EE315T | Advanced Power System Analysis                      | theory |
| 12    | 20EE315P | Advanced Power System Analysis Laboratory           | lab    |
| 13    | 20EE316T | Embedded Systems                                    | theory |
| 14    | 20EE316P | Embedded System Laboratory                          | lab    |
| 15    | 20EE317T | Electric Vehicles                                   | theory |
| 16    | 20EE318T | Net Zero Energy Buildings                           | theory |
| 17    | ?        | Industrial Training/ International Exposure Program | other  |

### ELEC sem 7 (Electrical_Semester_7_Course_Handout.pdf)

| Pages | Code     | Title                                                    | Kind   |
| ----- | -------- | -------------------------------------------------------- | ------ |
| 3-4   | 20EE401T | Electrical Machine Design                                | theory |
| 4     | 20EE402T | Smart Grid: Technologies and Applications                | theory |
| 5     | 21EE403T | Electricity Sector in India: Policies and Regulations    | theory |
| 6     | 20EE404T | FACTS and HVDC Power Transmission                        | theory |
| 7     | 20EE404P | FACTS and HVDC Power Transmission Laboratory             | lab    |
| 8     | 20EE405T | Digital Control                                          | theory |
| 9     | 20EE405P | Digital Control Laboratory                               | lab    |
| 10    | 20EE406T | Power Quality                                            | theory |
| 11    | 20EE406P | Power Quality Laboratory                                 | lab    |
| 12    | 20EE407T | Modelling and Analysis of Electrical Machines            | theory |
| 13    | 20EE407P | Modelling and Analysis of Electrical Machines Laboratory | lab    |
| 14    | 20EE408T | Electric Vehicle Technologies                            | theory |
| 15    | 20EE408P | Electric Vehicles Laboratory                             | lab    |

### ELEC sem 8 (Electrical_Semester_8_Course_Handout.pdf)

| Pages | Code    | Title                 | Kind  |
| ----- | ------- | --------------------- | ----- |
| 3-4   | 20EE410 | Major Project         | other |
| 4     | 20EE420 | Comprehensive Project | other |

### ICT sem 1 (ICT_Semester_1_Course_Handout.pdf)

| Pages | Code                  | Title                               | Kind   |
| ----- | --------------------- | ----------------------------------- | ------ |
| 3     | UG_1_T(CSE/ICT/EC/EE) | Computer Programming-I              | theory |
| 4     | UG_1_P(CSE/ICT/EC/EE) | Computer Programming – I Laboratory | lab    |

### ICT sem 2 (ICT_Semester_2_Course_Handout.pdf)

| Pages | Code                 | Title                                                         | Kind   |
| ----- | -------------------- | ------------------------------------------------------------- | ------ |
| 3     | UG_2_T(CE/ICT/EC/EE) | Computer Programming-II                                       | theory |
| 4     | UG_2_L(CE/ICT/EC/EE) | Computer Programming-II Laboratory                            | lab    |
| 5-6   | 24EE101T             | Elements of Electrical and Electronics Engineering            | theory |
| 6     | 24EE101P             | Elements of Electrical and Electronics Engineering Laboratory | lab    |

### ICT sem 3 (ICT_Semester_3_Course_Handout.pdf)

| Pages | Code     | Title                                     | Kind   |
| ----- | -------- | ----------------------------------------- | ------ |
| 3     | 24ICXXXT | Digital Circuits                          | theory |
| 4     | 24ICXXXP | Digital Circuits Lab                      | lab    |
| 5     | ?        | Data Structures and Algorithms            | theory |
| 6     | ?        | Data Structures and Algorithms Laboratory | lab    |
| 7     | 24ICXXXT | Fundamentals of ICT                       | theory |
| 8     | ?        | Electronic Devices and Circuits           | theory |

### ICT sem 4 (ICT_Semester_4_Course_Handout.pdf)

| Pages | Code      | Title                                               | Kind   |
| ----- | --------- | --------------------------------------------------- | ------ |
| 4     | ?         | Database Management Systems                         | theory |
| 4-5   | ?         | Database Management Systems Laboratory              | lab    |
| 6     | ?         | Principles of Programming Languages                 | theory |
| 7     | ?         | Principles of Programming Languages Laboratory      | lab    |
| 8     | ?         | Fundamentals of Signal Processing and Communication | theory |
| 9     | 24ICXXXT  | Computer Organization and Microprocessor            | theory |
| 10    | 24ICTXXXP | Computer Organization and Microprocessor Lab        | lab    |

### ICT sem 5 (ICT_Semester_5_Course_Handout.pdf)

| Pages | Code      | Title                                                | Kind   |
| ----- | --------- | ---------------------------------------------------- | ------ |
| 4     | ?         | Theory of Computation and Compiler Design            | theory |
| 5     | ?         | Theory of Computation and Compiler Design Laboratory | lab    |
| 6     | 24ICXXXT  | Digital Signal Processing                            | theory |
| 7     | 24ICXXXP  | Digital Signal Processing Lab                        | lab    |
| 8     | 24ICXXXT  | RF Engineering                                       | theory |
| 9-11  | 24ICTXXXP | RF Engineering Lab                                   | lab    |
| 12    | ?         | Optimization Methods and Algorithms                  | theory |
| 13    | 24IC301T  | Web Technology                                       | theory |
| 14    | ?         | Problem solving through Java                         | theory |

### ICT sem 6 (ICT_Semester_6_Course_Handout.pdf)

| Pages | Code      | Title                                     | Kind   |
| ----- | --------- | ----------------------------------------- | ------ |
| 4     | 20IC303T  | Digital Communication                     | theory |
| 5     | 24IC***P  | Digital Communication Lab                 | lab    |
| 6     | 24ICT***T | Computer Communication and Networking     | theory |
| 7-9   | 24ICT***P | Computer Communication and Networking Lab | lab    |
| 10    | ?         | Machine Learning                          | theory |
| 11    | 24ICXXXT  | Cloud Architecture and Services           | theory |
| 12    | 24ICXXXT  | Advanced Web Technology                   | theory |
| 13    | 24ICXXXT  | Image Processing                          | theory |
| 14    | ?         | Statistical Signal Processing             | theory |

### ICT sem 7 (ICT_Semester_7_Course_Handout.pdf)

| Pages | Code     | Title                                         | Kind   |
| ----- | -------- | --------------------------------------------- | ------ |
| 4     | ?        | Software Engineering Methodologies            | theory |
| 5     | ?        | Software Engineering Methodologies Laboratory | lab    |
| 6     | 24ICXXXT | Embedded Systems                              | theory |
| 7     | 24ICXXXP | Embedded Systems Lab                          | lab    |
| 8     | 24ICXXXT | Digital CMOS and VLSI Design                  | theory |
| 9-11  | ?        | Digital CMOS and VLSI Design Lab              | lab    |
| 12    | 24ICXXXT | Cryptography and Network Security             | theory |
| 13    | ?        | Optical Communication                         | theory |
| 14    | ?        | Internet of Things                            | theory |
| 15    | 24ICXXXT | Modern Wireless Communications                | theory |
| 16    | ?        | BLOCKCHAIN TECHNOLOGY                         | theory |
| 17    | 24ICXXXT | Mobile Application Development                | theory |

### ICT sem 8 (ICT_Semester_8_Course_Handout.pdf)

No course handouts found in this PDF.

### MECH sem 1 (Mechanical_Semester_1_Course_Handout.pdf)

| Pages | Code     | Title                               | Kind   |
| ----- | -------- | ----------------------------------- | ------ |
| 2     | 24MA101T | Mathematics – I                     | theory |
| 3     | 24PH102T | Engineering Physics (For ME, Civil) | theory |
| 4     | 24PH102P | Engineering Physics Laboratory      | lab    |
| 5     | 24BT102T | Biology For Engineers               | theory |
| 6     | 24CV101T | Environmental Science               | theory |
| 7     | 24CP101T | Computer Programming – I            | theory |
| 8     | 24CP101P | Computer Programming Laboratory – I | lab    |
| 9     | 24ME101T | Workshop Practice                   | lab    |
| 10    | 24ME102T | Engineering Graphics - Laboratory   | lab    |
| 11    | 24HS102T | Universal Human Values              | theory |

### MECH sem 2 (Mechanical_Semester_2_Course_Handout.pdf)

| Pages | Code     | Title                                                    | Kind   |
| ----- | -------- | -------------------------------------------------------- | ------ |
| 2     | 24MA103T | Mathematics – II                                         | theory |
| 3     | 24CH101T | Engineering Chemistry                                    | theory |
| 4     | 24CH101P | Engineering Chemistry Laboratory                         | lab    |
| 5     | 24CP102T | Computer Programming II (For ME/CL/CH/BT)                | theory |
| 6     | 24CP102P | Computer Programming II Laboratory (For ME/CL/CH/BT)     | lab    |
| 7     | 24EE101T | Elements of Electrical and Electronics Engineering       | theory |
| 8     | 24EE101P | Elements of Electrical and Electronics Engineering – Lab | lab    |
| 9     | 24HS103T | Indian Knowledge System                                  | theory |

### MECH sem 3 (Mechanical_Semester_3_Course_Handout.pdf)

| Pages | Code     | Title                                                             | Kind   |
| ----- | -------- | ----------------------------------------------------------------- | ------ |
| 2     | 24MA201T | Mathematics – III                                                 | theory |
| 3     | 24ME201T | Introduction to Artificial Intelligence in Mechanical Engineering | theory |
| 4     | 24ME202T | Engineering Mechanics                                             | theory |
| 5     | 24ME203T | Thermodynamics                                                    | theory |
| 6     | 24ME203P | Thermodynamics Laboratory                                         | lab    |
| 7     | 24ME204T | Mechanical Measurements and Metrology                             | theory |
| 8     | 24ME204P | Mechanical Measurements and Metrology Laboratory                  | lab    |
| 9     | 24ME205P | Mechanical Drawing Laboratory                                     | lab    |

### MECH sem 4 (Mechanical_Semester_4_Course_Handout.pdf)

| Pages | Code     | Title                                            | Kind   |
| ----- | -------- | ------------------------------------------------ | ------ |
| 2     | 24ME205T | Industry 4.0 for Mechanical Engineers            | theory |
| 3     | 24ME205P | Industry 4.0 Laboratory for Mechanical Engineers | lab    |
| 4     | 24ME206T | Fluid Mechanics                                  | theory |
| 5     | 24ME206P | Fluid Mechanics Laboratory                       | lab    |
| 6     | 24ME207T | Design and Kinematics of Machines                | theory |
| 7     | 24ME207P | Design and Kinematics of Machines Laboratory     | lab    |
| 8     | 24ME208T | Engineering Metallurgy                           | theory |
| 9     | 24ME208P | Engineering Metallurgy Lab                       | lab    |
| 10    | 24ME209T | Strength of Material                             | theory |
| 11    | 24ME209P | Strength of Materials Laboratory                 | lab    |

### MECH sem 5 (Mechanical_Semester_5_Course_Handout.pdf)

| Pages | Code     | Title                                         | Kind   |
| ----- | -------- | --------------------------------------------- | ------ |
| 2     | 24ME331T | Introduction to Composite Materials           | theory |
| 3     | 24ME332T | Renewable and Sustainable Energy Technologies | theory |
| 4     | 24ME333T | Fluid Machinery                               | theory |
| 5     | 24ME334T | Laser & electron beam Material Processing     | theory |
| 6     | 24ME301T | Heat Transfer                                 | theory |
| 7     | 24ME301P | Heat Transfer Laboratory                      | lab    |
| 8     | 24ME302T | Dynamics of Machines                          | theory |
| 9     | 24ME302P | Dynamics of Machines Laboratory               | lab    |
| 10    | 24ME303T | Manufacturing Process-I                       | theory |
| 11    | 24ME303P | Manufacturing Process-I Laboratory            | lab    |

### MECH sem 6 (Mechanical_Semester_6_Course_Handout.pdf)

| Pages | Code     | Title                                         | Kind   |
| ----- | -------- | --------------------------------------------- | ------ |
| 2     | 24ME335T | Mechanical Vibrations                         | theory |
| 3     | 24ME336T | Additive Manufacturing                        | theory |
| 4     | 24ME337T | Production and Operations Management          | theory |
| 5     | 24ME338T | Heat Exchanger Design                         | theory |
| 6     | 24ME304T | Refrigeration and Air-conditioning            | theory |
| 7     | 24ME304P | Refrigeration and Air-conditioning Laboratory | lab    |
| 8     | 24ME305T | Machine Design - I                            | theory |
| 9     | 24ME305P | Machine Design -I Laboratory                  | lab    |
| 10    | 24ME306T | Manufacturing Process- II                     | theory |
| 11    | 24ME306P | Manufacturing Process- II Laboratory          | lab    |
| 12    | 24ME307T | Robotics                                      | theory |
| 13    | 24ME307P | Robotics Laboratory                           | lab    |

### MECH sem 7 (Mechanical_Semester_7_Course_Handout.pdf)

| Pages | Code     | Title                                                           | Kind   |
| ----- | -------- | --------------------------------------------------------------- | ------ |
| 2     | 24ME431T | EXERGY ANALYSIS OF THERMAL SYSTEM                               | theory |
| 3     | 24ME432T | Machine Design - II                                             | theory |
| 4     | 24ME433T | Micro and Nano Manufacturing                                    | theory |
| 5     | 24ME434T | Cryogenics                                                      | theory |
| 6     | 24ME435T | Computer Aided Design                                           | theory |
| 7     | 24ME436T | Welding for Metal Joining, Surfacing and Additive Manufacturing | theory |
| 8     | 24ME437T | Automobile Engineering                                          | theory |
| 9     | 24ME438T | Computer Aided Manufacturing                                    | theory |
| 10    | 24ME439T | Non-Destructive testing and failure analysis                    | theory |
| 11-12 | 24ME440T | Material and Procurement Management                             | theory |
| 13    | 24ME401T | Optimization Techniques                                         | theory |
| 14    | 24ME402T | Project Management                                              | theory |
| 15    | 24ME403P | Computational Engineering Laboratory                            | lab    |

### MECH sem 8 (Mechanical_Semester_8_Course_Handout.pdf)

No course handouts found in this PDF.

### PETRO sem 1 (Petroleum_Semester_1_Course_Handout.pdf)

| Pages | Code     | Title                                      | Kind   |
| ----- | -------- | ------------------------------------------ | ------ |
| 2     | 24MA101T | Mathematics - I                            | theory |
| 3     | 24CP101T | Computer Programming – I                   | theory |
| 4     | 24CP101P | Computer Programming-I Laboratory          | lab    |
| 5     | 24PH103T | Modern Physics                             | theory |
| 6     | 24PH103P | Modern Physics Laboratory                  | lab    |
| 7     | 24CV101T | Environment Science                        | theory |
| 8     | 24ME101P | Workshop Practices                         | lab    |
| 9     | 24ME102P | Engineering Graphics                       | lab    |
| 10    | 24PE101T | Geology for Petroleum Engineers            | theory |
| 11    | 24PE101P | Geology for Petroleum Engineers Laboratory | lab    |
| 12    | 24HS101T | English Communication                      | theory |
| 13    | 24HS102T | Universal Human Values                     | theory |

### PETRO sem 2 (Petroleum_Semester_2_Course_Handout.pdf)

| Pages | Code     | Title                                        | Kind   |
| ----- | -------- | -------------------------------------------- | ------ |
| 2     | 24MA103T | Mathematics – II                             | theory |
| 3     | 24CP102T | Computer Programming – II                    | theory |
| 4     | 24CP102P | Computer Programming-II Laboratory           | lab    |
| 5     | 24CH102T | Chemistry                                    | theory |
| 6     | 24CH102P | Chemistry Laboratory                         | lab    |
| 7     | 24PE102T | Sedimentary and Petroleum Geology            | theory |
| 8     | 24PE102P | Sedimentary and Petroleum Geology Laboratory | lab    |
| 9     | 24HS103T | Indian Knowledge System                      | theory |
| 10    | 24HS104T | Organizational Behaviour                     | theory |
| 11    | 24HS105T | Professional Communication                   | theory |
| 12    | 24YOG101 | Yoga, Health & Hygiene                       | other  |
| 13    | 24NSS101 | National Service Scheme (NSS)                | other  |
| 14    | 24NCC101 | National Cadet Corps (NCC)                   | other  |

### PETRO sem 3 (Petroleum_Semester_3_Course_Handout.pdf)

| Pages | Code     | Title                                                   | Kind   |
| ----- | -------- | ------------------------------------------------------- | ------ |
| 2     | 24INT152 | Rural Internship                                        | other  |
| 3     | 24MA201T | Mathematics – III                                       | theory |
| 4     | 24PE201T | Introduction to Artificial Intelligence                 | theory |
| 5     | 25PE201T | Fundamentals of Fluid Mechanics for Petroleum Engineers | theory |
| 6     | 24PE203T | Thermodynamics of Petroleum Reservoir Fluids            | theory |
| 7     | 24PE204T | Geomechanics and Strength of Materials                  | theory |
| 8     | 24PE204P | Geomechanics and Strength of Materials Practical        | lab    |
| 9     | 24PE205T | Petroleum Exploration                                   | theory |
| 10    | 24PE205P | Petroleum Exploration Laboratory                        | lab    |

### PETRO sem 4 (Petroleum_Semester_4_Course_Handout.pdf)

| Pages | Code     | Title                                                | Kind   |
| ----- | -------- | ---------------------------------------------------- | ------ |
| 2     | 24PE206T | Industry 4.0                                         | theory |
| 3     | 24PE206P | Industrial 4.0 Laboratory                            | lab    |
| 4     | 24PE207T | Drilling Engineering                                 | theory |
| 5     | 24PE207P | Drilling Engineering Laboratory                      | lab    |
| 6     | 24PE208T | Reservoir Engineering                                | theory |
| 7     | 24PE209T | Well Log and Formation Evaluation                    | theory |
| 8     | 24PE202T | Heat and Mass Transfer                               | theory |
| 9     | 24PE210T | Earth Science and Hydrocarbon Exploration Field Work | lab    |

### PETRO sem 5 (Petroleum_Semester_5_Course_Handout.pdf)

| Pages | Code     | Title                                                      | Kind   |
| ----- | -------- | ---------------------------------------------------------- | ------ |
| 2     | 24HS303T | Petroleum Engineering Economics                            | theory |
| 3     | 24PE331T | Health Safety and Environment                              | theory |
| 4     | 24PE332T | Petroleum Refinery Engineering                             | theory |
| 5     | 24PE301T | Well Completion and Fundamentals of Production Engineering | theory |
| 6     | 24PE302T | Well Test Analysis                                         | theory |
| 7     | 24PE303T | Advanced Drilling Technology                               | theory |
| 8     | 24PE304P | Introduction to Petroleum Software Laboratory              | lab    |
| 9     | 24PE305P | Petroleum Engineering – I Laboratory                       | lab    |
| 10    | 24INT251 | Industrial Orientation                                     | other  |

### PETRO sem 6 (Petroleum_Semester_6_Course_Handout.pdf)

| Pages | Code     | Title                                       | Kind   |
| ----- | -------- | ------------------------------------------- | ------ |
| 2     | 24PE333T | Data Analytics for Petroleum Engineers      | theory |
| 3     | 24PE334T | Carbon Utilisation and Storage              | theory |
| 4     | 25PE331T | Natural Gas Engineering and LNG Value Chain | theory |
| 5     | 24PE336T | Pipeline Engineering                        | theory |
| 6     | 24PE306T | Reservoir Modelling and Simulation          | theory |
| 7     | 24PE307T | Surface and Offshore Production Operations  | theory |
| 8     | 24PE308T | Unconventional Hydrocarbon Energy Resources | theory |
| 9     | 24PE309P | Petroleum Engineering – II Laboratory       | lab    |
| 10    | 24PE310P | Petroleum Product Testing Laboratory        | lab    |

### PETRO sem 7 (Petroleum_Semester_7_Course_Handout.pdf)

| Pages | Code     | Title                                                             | Kind   |
| ----- | -------- | ----------------------------------------------------------------- | ------ |
| 2     | 24INT451 | Summer Internship                                                 | other  |
| 3     | 24PE431T | Flow Assurance                                                    | theory |
| 4     | 24PE432T | Corrosion Studies in Petroleum Industry                           | theory |
| 5     | 24PE433T | Nanotechnology in Oil and Gas industry                            | theory |
| 6     | 25PE431T | City Gas Distribution                                             | theory |
| 7     | 24PE401T | Well Stimulation and Artificial Lift Techniques                   | theory |
| 8     | 24PE402T | Integrated Reservoir Management and Enhanced Oil Recovery Methods | theory |
| 9     | 24PE403P | Reservoir Engineering Software Laboratory                         | lab    |
| 10    | 24PE404T | Hydrocarbon Contracts and Asset Management                        | theory |

### PETRO sem 8 (Petroleum_Semester_8_Course_Handout.pdf)

| Pages | Code      | Title                                            | Kind  |
| ----- | --------- | ------------------------------------------------ | ----- |
| 2     | 24PRPE452 | /24PRPE453 Major Project / Comprehensive Project | other |
