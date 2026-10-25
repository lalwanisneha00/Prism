# Rearrange report (dry run)

Made by `npm run handouts:match`. **Nothing has been changed yet.** This lists what would change if approved. Moves keep ids (so student progress stays linked), additions are only for things genuinely missing, and retirements are soft (hidden, never deleted).

CSBS and CSSE are skipped (no handouts). ELEC (`elec`) and CHEM (`chem`) are new branches, so all their courses show as links or new courses.

## Course types

Theory = lectures only. Practice = lectures plus practical hours in one course. Practical = lab (its units are its experiments). The handouts print no course type field, so the type comes from the title, the L-T-P hours and whether the course lists units or experiments, checked against the code's T/P letter.

| Branch  | Theory | Practice | Practical | Not taught (internship etc.) | Undetected |
| ------- | ------ | -------- | --------- | ---------------------------- | ---------- |
| BIOTECH | 50     | 0        | 22        | 6                            | 0          |
| CHEM    | 49     | 0        | 21        | 9                            | 0          |
| CIVIL   | 28     | 2        | 20        | 2                            | 0          |
| COMP    | 64     | 0        | 21        | 3                            | 0          |
| ECE     | 44     | 0        | 21        | 3                            | 0          |
| ELEC    | 38     | 0        | 27        | 4                            | 0          |
| ICT     | 33     | 0        | 16        | 0                            | 0          |
| MECH    | 48     | 0        | 23        | 0                            | 0          |
| PETRO   | 45     | 0        | 18        | 7                            | 0          |
| **All** | 399    | 2        | 189       | 34                           | 0          |

Type detected for every taught course. Disagreements (code vs handout, L-T-P vs title) are in needs_review below.

## Counts per branch

| Change                              | biotech | chem | civil | ce  | ece | elec | ict | me  | petro | All |
| ----------------------------------- | ------- | ---- | ----- | --- | --- | ---- | --- | --- | ----- | --- |
| course missing from branch/semester | 0       | 14   | 2     | 0   | 4   | 0    | 0   | 6   | 0     | 26  |
| course in wrong semester            | 0       | 0    | 0     | 1   | 0   | 0    | 0   | 5   | 0     | 6   |
| course in wrong branch              | 0       | 0    | 0     | 0   | 0   | 0    | 0   | 0   | 0     | 0   |
| new course                          | 0       | 36   | 0     | 5   | 0   | 38   | 0   | 21  | 0     | 100 |
| new practical course                | 21      | 20   | 17    | 21  | 21  | 27   | 16  | 22  | 17    | 182 |
| unit under wrong course             | 0       | 0    | 0     | 0   | 0   | 0    | 0   | 0   | 0     | 0   |
| unit wrong order                    | 0       | 0    | 0     | 0   | 0   | 0    | 0   | 11  | 0     | 11  |
| unit missing                        | 0       | 0    | 0     | 0   | 2   | 0    | 1   | 16  | 0     | 19  |
| unit rename                         | 0       | 0    | 0     | 0   | 0   | 0    | 0   | 9   | 8     | 17  |
| topic under wrong unit              | 2       | 0    | 0     | 20  | 5   | 0    | 0   | 38  | 3     | 68  |
| topic missing                       | 36      | 0    | 18    | 103 | 40  | 0    | 22  | 140 | 45    | 404 |
| topic split                         | 191     | 0    | 106   | 160 | 145 | 0    | 131 | 32  | 211   | 976 |
| extra item not in any handout       | 10      | 0    | 13    | 45  | 15  | 0    | 13  | 379 | 10    | 485 |
| **needs_review**                    | 20      | 4    | 10    | 18  | 6   | 26   | 10  | 29  | 4     | 127 |

## Planned changes

### biotech

<details><summary>new practical course (21)</summary>

- sem 1: Add lab "Computer Programming Laboratory – I" (9 experiments), related to Computer Programming – I
- sem 1: Add lab "Modern Physics Laboratory" (15 experiments), related to Modern Physics
- sem 1: Add lab "Workshop Practices" (10 experiments)
- sem 2: Add lab "Computer Programming Laboratory – II" (8 experiments), related to Computer Programming – II
- sem 2: Add lab "Engineering Chemistry Laboratory" (11 experiments), related to Engineering Chemistry
- sem 2: Add lab "Elements of Electrical and Electronics Engineering Laboratory" (14 experiments), related to Elements of Electrical and Electronics Engineering
- sem 3: Add lab "Principles of Biochemistry Laboratory" (12 experiments), related to Principles of Biochemistry
- sem 3: Add lab "Human Anatomy and physiology Lab -I" (12 experiments), related to Human Anatomy and physiology -I
- sem 3: Add lab "General Microbiology Lab" (9 experiments), related to General Microbiology
- sem 4: Add lab "Molecular Biology & Genetics Laboratory" (10 experiments)
- sem 4: Add lab "Bioprocess Engineering Lab" (15 experiments), related to Bioprocess Engineering
- sem 4: Add lab "Human Anatomy and physiology Lab -II" (14 experiments), related to Human Anatomy and physiology -II
- sem 4: Add lab "Analytical Bioinformatics Lab" (10 experiments), related to Analytical Bioinformatics
- sem 5: Add lab "Genomics and Proteomics Lab" (10 experiments), related to Genomics and Proteomics
- sem 5: Add lab "Immunology and Immunotechnology Laboratory" (10 experiments), related to Immunology and Immunotechnology
- sem 5: Add lab "Animal and Plant Biotechnology Lab" (14 experiments), related to Animal and Plant Biotechnology
- sem 6: Add lab "Genetic Engineering Laboratory" (10 experiments)
- sem 6: Add lab "Tissue Engineering and Regenerative Medicine Lab" (10 experiments)
- sem 6: Add lab "Pharmacology of Drug Action Laboratory" (12 experiments), related to Pharmacology of Drug Action
- sem 7: Add lab "Nanotechnology lab" (10 experiments), related to Nanotechnology
- sem 7: Add lab "Downstream processing lab" (9 experiments), related to Downstream Processing

</details>

<details><summary>topic under wrong unit (2)</summary>

- sem 3: Move topic "Bayesian Networks and Fuzzy Neural Networks with case studies" from chapter "Applications of AI in Biotechnology" to "Supervised/ Unsupervised Learning"
- sem 6: Move topic "solid state fermentation" from chapter "Food Biotechnology" to "Food Processing and Preservation"

</details>

<details><summary>topic missing (36)</summary>

- sem 1: Add topic "Prefixes and Suffixes, Connotations, Collocations" to chapter "English Grammar and Vocabulary" [course shared with ce]
- sem 1: Add topic "Thermal Pollution" to chapter "Multi-scale Environmental Pollution (global, Regional and Local)"
- sem 1: Add topic "Radioactive Pollution" to chapter "Multi-scale Environmental Pollution (global, Regional and Local)"
- sem 2: Add topic "change of variables (Cartesian to spherical, cylindrical), Applications, Area, Volume" to chapter "Multiple Integrals"
- sem 2: Add topic "Operation of transformer on noload and load" to chapter "Introduction to Electrical Machines and Electrical Installation"
- sem 2: Add topic "types of 3-phase induction motors" to chapter "Introduction to Electrical Machines and Electrical Installation"
- sem 2: Add topic "production of rotating magnetic field, operation" to chapter "Introduction to Electrical Machines and Electrical Installation"
- sem 2: Add topic "starting and running torques" to chapter "Introduction to Electrical Machines and Electrical Installation"
- sem 2: Add topic "Torque-slip characteristics" to chapter "Introduction to Electrical Machines and Electrical Installation"
- sem 2: Add topic "Power Stages in an induction motor" to chapter "Introduction to Electrical Machines and Electrical Installation"
- sem 3: Add topic "Best practices in machine learning (bias/variance theory" to chapter "Supervised/ Unsupervised Learning"
- sem 3: Add topic "innovation process in machine learning and AI" to chapter "Supervised/ Unsupervised Learning"
- sem 3: Add topic "Support vector machines (SVMs)" to chapter "Supervised/ Unsupervised Learning"
- sem 3: Add topic "Characteristics and functionsHrs of Blood cells" to chapter "Blood and Lymphatic system"
- sem 3: Add topic "subcellular structures and cell envelope, slime, capsule" to chapter "Subcellular Structures"
- sem 4: Add topic "Modes of bioreactor operation: Batch" to chapter "Introduction"
- sem 5: Add topic "Exponential growth: Four spikes and the reason for spikes" to chapter "Environmental Degradation"
- sem 5: Add topic "impact and significance of exponential growth" to chapter "Environmental Degradation"
- sem 5: Add topic "Sustainability of exponential growth" to chapter "Environmental Degradation"
- sem 5: Add topic "Ecological balance and ecological footprint" to chapter "Environmental Degradation"
- sem 5: Add topic "Innate and Acquired Immunity, Haematopoiesis" to chapter "Fundamental Concepts of Immunology"
- sem 5: Add topic "Effector functions, Isotope, Allotype, Idiotype" to chapter "Humoral Immunity"
- sem 5: Add topic "immune complex mediated (type III) hypersensitivity and delayed type (Type IV) hypersensitivity" to chapter "Cell Mediated Immunity"
- sem 5: Add topic "Immunological basis of graft rejection" to chapter "Cell Mediated Immunity"
- sem 5: Add topic "Embryo transferMicromanipulation technology" to chapter "Transgenics Plants and Animals – Applications"
- sem 6: Add topic "Antiarrhythmic drugs" to chapter "Structure Activity Relationships"
- sem 6: Add topic "traditional methods like salting/ syruping, pickling" to chapter "Food Processing and Preservation"
- sem 6: Add topic "non- thermal processes like MAP, irradiation" to chapter "Food Processing and Preservation"
- sem 6: Add topic "high pressure processing etc" to chapter "Food Processing and Preservation"
- sem 6: Add topic "hurdle technology" to chapter "Food Processing and Preservation"
- sem 6: Add topic "International Plant Protection Convention (IPPC)" to chapter "Food Safety and Regulation"
- sem 6: Add topic "National Codex Committee of India, ToR, Functions" to chapter "Food Safety and Regulation"
- sem 7: Add topic "Guidelines and Case studies" to chapter "Clinical Trials"
- sem 7: Add topic "activities in cell physiology and developmental process" to chapter "Synthetic Circuits"
- sem 7: Add topic "OTAL HOURS" to chapter "Bioconversions"
- sem 7: Add topic "Electrically-driven processes (Electro dialysis)" to chapter "Separation"

</details>

<details><summary>topic split (191)</summary>

- sem 1: Split topic "Why English? Types of Communication" into "Why English?", "Types of Communication" (first keeps id why-english-types-of-communication) [course shared with ce]
- sem 1: Split topic "Listening Skills: Difference between listening and hearing, Active listening and passive listening" into "Listening Skills: Difference between listening and hearing", "Active listening and passive listening" (first keeps id listening-skills-difference-between-listening-and-hearing) [course shared with ce]
- sem 1: Split topic "Types of listening, Traits of good listener" into "Types of listening", "Traits of good listener" (first keeps id types-of-listening-traits-of-good-listener) [course shared with ce]
- sem 1: Split topic "Reading Skills: Why reading is important, Effective reading techniques, Speed Reading, The SQ3R Method" into "Reading Skills: Why reading is important", "Effective reading techniques", "Speed Reading", "The SQ3R Method" (first keeps id reading-skills-why-reading-is-important-effective-reading) [course shared with ce]
- sem 1: Split topic "Sets and their representation. Union, intersection, and complement. Mapping or function. One-one" into "Sets and their representation, Union, intersection, complement", "Mapping or function", "One-one" (first keeps id sets-and-their-representation-union-intersection-and)
- sem 1: Split topic "onto mappings. Inverse and composite mappings" into "onto mappings", "Inverse and composite mappings" (first keeps id onto-mappings-inverse-and-composite-mappings)
- sem 1: Split topic "go to statement. Loop control structures- while" into "go to statement", "Loop control structures- while" (first keeps id go-to-statement-loop-control-structures-while) [course shared with ece]
- sem 1: Split topic "Array Manipulations. Matrix operations" into "Array Manipulations", "Matrix operations" (first keeps id array-manipulations-matrix-operations) [course shared with ece]
- sem 1: Split topic "Pointer" into "Pointer arithmetic", "Pointer to pointer" (first keeps id pointer) [course shared with ece]
- sem 1: Split topic "Engineering Physics related applications. Davisson Germer experiment" into "Engineering Physics related applications", "Davisson Germer experiment" (first keeps id engineering-physics-related-applications-davisson-germer)
- sem 1: Split topic "Physical and mathematical concepts of gradient, divergence and curl, Gauss theorem, applications in gravitation and electrostatics" into "Physical and mathematical concepts of gradient", "divergence and curl", "Gauss theorem", "applications in gravitation and electrostatics" (first keeps id gradient-divergence-curl)
- sem 1: Split topic "Equation of continuity, Biot Savart law" into "Equation of continuity", "Biot Savart law" (first keeps id biot-savart-law)
- sem 1: Split topic "magnetization and magnetic intensity, Faraday’s law of Maxwell’s equations, wave equation for electromagnetic radiation, applications of optical fibers in communication" into "magnetization and magnetic intensity", "Faraday’s law of Maxwell’s equations", "wave equation for electromagnetic radiation", "applications of optical fibers in communication" (first keeps id maxwells-equations)
- sem 1: Split topic "Introduction to BCS Theory. Concepts of LASER" into "Introduction to BCS Theory", "Concepts of LASER" (first keeps id introduction-to-bcs-theory-concepts-of-laser)
- sem 1: Split topic "Sustainable Development" into "Sustainable Development", "Sustainable Development Goals" (first keeps id sustainable-development)
- sem 1: Split topic "Its importance and Multidisciplinary nature, Introduction to Environmental Parameters and their standards (air, water, soil, noise, etc.)" into "Its importance and Multidisciplinary nature", "Introduction to Environmental Parameters and their standards (air, water, soil, noise, etc.)" (first keeps id its-importance-and-multidisciplinary-nature-introduction-to)
- sem 1: Split topic "Ecosystem and its types, Ideal ecosystem, Biodiversity : Its importance and conservation" into "Ecosystem and its types", "Ideal ecosystem", "Biodiversity : Its importance and conservation" (first keeps id ecosystem-and-its-types-ideal-ecosystem-biodiversity-its)
- sem 1: Split topic "Pollution, Causes and Effects of different types of pollution : Air Pollution, Water Pollution, Soil Pollution, Solid Waste (organic and Inorganic) Pollution, Hazardous Waste Pollution, Marine Polluti" into "Pollution, Causes and Effects of different types of pollution : Air Pollution", "Water Pollution", "Soil Pollution", "Solid Waste (organic and Inorganic) Pollution", "Hazardous Waste Pollution", "Marine Pollution" (first keeps id pollution-causes-and-effects-of-different-types-of-pollution)
- sem 1: Split topic "Introduction to man-made disasters like floods, heat waves, landslides, etc., Introduction to the various instruments for measuring air pollution, water pollution, noise, etc" into "Noise Pollution", "Introduction to man-made disasters like floods", "heat waves, landslides, etc", "Introduction to the various instruments for measuring air pollution", "water pollution, noise" (first keeps id introduction-to-man-made-disasters-like-floods-heat-waves)
- sem 1: Split topic "understanding material (physical facilities) and spiritual needs - need of mind and body" into "understanding material (physical facilities) and spiritual needs", "need of mind and body" (first keeps id understanding-material-physical-facilities-and-spiritual) [course shared with ece, civil]
- sem 1: Split topic "Nucleic Acids: Structure and roles of DNA and RNA. Proteins: Structure, and its functions" into "Nucleic Acids: Structure and roles of DNA and RNA", "Proteins: Structure, its functions" (first keeps id dna-rna-structure)
- sem 1: Split topic "Significance of lipids. Role of biomolecules: Characteristics and roles of enzymes, vitamins, and hormones" into "Significance of lipids", "Role of biomolecules: Characteristics and roles of enzymes, vitamins, hormones" (first keeps id significance-of-lipids-role-of-biomolecules-characteristics)
- sem 1: Split topic "Photosynthesis (photovoltaic cells, bionic leaf). Bird flying (GPS and aircrafts)" into "Photosynthesis (photovoltaic cells", "bionic leaf)", "Bird flying (GPS and aircrafts)" (first keeps id photosynthesis-photovoltaic-cells-bionic-leaf-bird-flying)
- sem 1: Split topic "Biology and engineering crosstalk –Hybridoma technology, Plant Tissue Culture, Animal Tissue Culture" into "Biology and engineering crosstalk –Hybridoma technology", "Plant Tissue Culture", "Animal Tissue Culture", "Tissue Engineering" (first keeps id biology-and-engineering-crosstalk-hybridoma-technology-plant)
- sem 1: Split topic "Tissue Engineering, Introduction to Biomimetics and Biomimicry, Nanobiotechnology, Introduction to Radiology, High-throughput diagnostics in clinics, Bioprocessing and Biomaterials" into "Introduction to Biomimetics and Biomimicry, Nanobiotechnology", "Introduction to Radiology", "High-throughput diagnostics in clinics", "Bioprocessing and Biomaterials" (first keeps id tissue-engineering-introduction-to-biomimetics-and)
- sem 1: Split topic "Bio printing techniques and materials. Applications of Bioinformatics" into "Bio printing techniques and materials", "Applications of Bioinformatics" (first keeps id bio-printing-techniques-and-materials-applications-of)
- sem 2: Split topic "Proposal writing (Project, Research and Business)" into "Proposal writing (Project", "Research and Business)" (first keeps id proposal-writing-project-research-and-business) [course shared with ce]
- sem 2: Split topic "Language and Communication: Ethical Considerations: Interdisciplinary Perspective: Communication Skills: Philosophy of Science" into "Language and Communication", "Ethical Considerations", "Interdisciplinary Perspective", "Communication Skills", "Philosophy of Science" (first keeps id language-and-communication-ethical-considerations) [course shared with ce]
- sem 2: Split topic "Definition Evaluation of double integral (Cartesian - Polar form), Change of orders, Change of variables, Evaluation of triple integral, change of variables (Cartesian to spherical - and cylindrical)," into "Definition Evaluation of double integral (Cartesian", "Polar form)", "Change of orders", "Change of variables", "Evaluation of triple integral" (first keeps id double-integrals)
- sem 2: Split topic "Comparison with other programming languages. Python IDEs Tokens: Identifiers" into "Comparison with other programming languages", "Python IDEs Tokens: Identifiers" (first keeps id comparison-with-other-programming-languages-python-ides) [course shared with ece]
- sem 2: Split topic "elif and else" into "elif and else, nesting", "for else and while else" (first keeps id elif-and-else) [course shared with ece]
- sem 2: Split topic "Decorator function" into "Decorator function", "Decorator chaining Generator function" (first keeps id decorator-function) [course shared with ece]
- sem 2: Split topic "metallic materials, polymeric, ceramic materials Advanced Materials: Introduction to nanomaterials: Properties and application" into "metallic materials, polymeric", "ceramic materials Advanced Materials: Introduction to nanomaterials: Properties and application" (first keeps id metallic-materials-polymeric-ceramic-materials-advanced) [course shared with ce]
- sem 2: Split topic "Carbonaceous materials (fullerene, carbon nanotube, graphene, etc.)" into "Carbonaceous materials (fullerene", "carbon nanotube, graphene, etc.)" (first keeps id carbonaceous-materials-fullerene-carbon-nanotube-graphene) [course shared with ce]
- sem 2: Split topic "Instrumentation, principle and characterization of materials: X-ray diffraction (XRD), Electro analytical techniques" into "Instrumentation, principle and characterization of materials: X-ray diffraction (XRD)", "Electro analytical techniques" (first keeps id instrumentation-principle-and-characterization-of-materials) [course shared with ce]
- sem 2: Split topic "FTIR, UV- visible spectroscopy" into "FTIR", "UV- visible spectroscopy" (first keeps id ftir-uv-visible-spectroscopy) [course shared with ce]
- sem 2: Split topic "Adsorption - Characteristics, Classification, Application , Adsorption isotherms- Freundlich, Langmuir & BET Chemical Kinetics - Rate law, Arrhenius equation, Transition state theory, Collision theory" into "Adsorption, Characteristics, Classification, Application", "Adsorption isotherms- Freundlich", "Langmuir & BET Chemical Kinetics", "Rate law", "Arrhenius equation", "Transition state theory", "Collision theory" (first keeps id adsorption-characteristics-classification-application) [course shared with ce]
- sem 2: Split topic "Complex reactions Catalysis - Homogeneous and Heterogeneous Catalysis" into "Complex reactions Catalysis", "Homogeneous and Heterogeneous Catalysis" (first keeps id complex-reactions-catalysis-homogeneous-and-heterogeneous) [course shared with ce]
- sem 2: Split topic "Principles of primary and secondary batteries, Fuel Cells and their operation principles, Principles and uses of supercapacitors" into "Principles of primary and secondary batteries", "Fuel Cells and their operation principles", "Principles and uses of supercapacitors" (first keeps id principles-of-primary-and-secondary-batteries-fuel-cells-and) [course shared with ce]
- sem 2: Split topic "Semiconductor Diodes and Applications, Diode as a Switch, Diode as a Rectifier, Half Wave and Full Wave Rectifiers with and without Filters" into "Semiconductor Diodes and Applications", "Diode as a Switch", "Diode as a Rectifier", "Half Wave and Full Wave Rectifiers with and without Filters" (first keeps id rectifiers)
- sem 2: Split topic "Breakdown Mechanisms, Zener Diode – Operation and Applications" into "Breakdown Mechanisms", "Zener Diode", "Operation and Applications" (first keeps id breakdown-mechanisms-zener-diode-operation-and-applications)
- sem 2: Split topic "Opto-Electronic Devices–LEDs, Photo Diode and Applications" into "Opto-Electronic Devices–LEDs", "Photo Diode and Applications" (first keeps id opto-electronic-devices-leds-photo-diode-and-applications)
- sem 2: Split topic "Transistor Characteristics covering, Bipolar Junction Transistor (BJT)" into "Transistor Characteristics covering", "Bipolar Junction Transistor (BJT)" (first keeps id pn-junction-physics)
- sem 2: Split topic "Construction, Operation, Amplifying Action, Common Base, Common Emitter and Common Collector Configurations, Field Effect Transistor (FET)" into "Amplifying Action", "Common Base", "Common Emitter and Common Collector Configurations", "Field Effect Transistor (FET)" (first keeps id construction-operation-amplifying-action-common-base-common)
- sem 2: Split topic "instantaneous power" into "instantaneous power", "average power and reactive power" (first keeps id instantaneous-power)
- sem 2: Split topic "polyphase circuits" into "polyphase circuits", "power measurement in polyphase circuits" (first keeps id polyphase-circuits)
- sem 2: Split topic "Magnetic materials and its B-H characteristic, Faraday’s Law of Electromagnetic Induction" into "Magnetic materials and its B-H characteristic", "Faraday’s Law of Electromagnetic Induction" (first keeps id faradays-law)
- sem 2: Split topic "Components of LT Switchgear: Switch Fuse Unit (SFU), MCB, ELCB, MCCB, Types of Wires and Cables, Earthing, Types of Batteries, Important Characteristics for Batteries" into "Components of LT Switchgear: Switch Fuse Unit (SFU)", "MCB", "ELCB", "MCCB", "Types of Wires and Cables, Earthing", "Types of Batteries", "Important Characteristics for Batteries" (first keeps id lt-switchgear)
- sem 2: Split topic "Elementary calculations for energy consumption, Electrical safety rules" into "Elementary calculations for energy consumption", "Electrical safety rules" (first keeps id elementary-calculations-for-energy-consumption-electrical)
- sem 2: Split topic "Civil engineering: Urban planning, water management" into "Civil engineering: Urban planning", "water management" (first keeps id civil-engineering-urban-planning-water-management)
- sem 2: Split topic "Materials engineering: Sustainable materials, traditional construction techniques Material science and Metallurgy in IKS" into "Materials engineering: Sustainable materials", "traditional construction techniques Material science and Metallurgy in IKS" (first keeps id materials-engineering-sustainable-materials-traditional)
- sem 2: Split topic "IKS and Indian Mathematics, Algebra, Geometry, Trignometry, Binary Mathematics, Magic" into "IKS and Indian Mathematics, Algebra, Geometry, Trignometry", "Binary Mathematics, Magic" (first keeps id iks-and-indian-mathematics-algebra-geometry-trignometry)
- sem 2: Split topic "IKS and Indian Astronomy, Pañcāṅga – The Indian calendar system" into "IKS and Indian Astronomy", "Pañcāṅga", "The Indian calendar system" (first keeps id iks-and-indian-astronomy-pancanga-the-indian-calendar-system)
- sem 2: Split topic "Concept of state, Anushashan Parwa of Mahabharat" into "Concept of state", "Anushashan Parwa of Mahabharat" (first keeps id concept-of-state-anushashan-parwa-of-mahabharat)
- sem 2: Split topic "Definition and scope of organization, behaviour, and organizational behaviour" into "Definition and scope of organization, behaviour", "organizational behaviour" (first keeps id definition-and-scope-of-organization-behaviour-and)
- sem 2: Split topic "power dynamics, and organizational politics" into "power dynamics", "organizational politics" (first keeps id power-dynamics-and-organizational-politics)
- sem 3: Split topic "Approaches and tools for Artificial Intelligence. Introduction to search" into "Approaches and tools for Artificial Intelligence", "Introduction to search" (first keeps id approaches-and-tools-for-artificial-intelligence)
- sem 3: Split topic "Linear Classifiers & Logistic Regression" into "Linear Classifiers & Logistic Regression", "Linear Classifiers" (first keeps id linear-regression-ml)
- sem 3: Split topic "Decision Trees" into "Decision Trees", "Preventing Overfitting in Decision Trees" (first keeps id decision-trees)
- sem 3: Split topic "parametric/non-parametric algorithms, support vector machines, kernels, neural networks, Unsupervised learning - clustering, dimensionality reduction, recommender systems, deep learning, Best practice" into "parametric/non-parametric algorithms", "support vector machines, kernels", "neural networks", "Unsupervised learning, clustering", "dimensionality reduction", "recommender systems", "deep learning" (first keeps id svm)
- sem 3: Split topic "Decision trees –Statistical Learning methods - Introduction to deep learning" into "Decision trees –Statistical Learning methods", "Introduction to deep learning" (first keeps id decision-trees-statistical-learning-methods-introduction-to)
- sem 3: Split topic "Introduction to biological system, Review on cellular, chemical, physical, genetic and evolutionary backgrounds to biochemistry" into "Introduction to biological system", "Review on cellular, chemical, physical", "genetic and evolutionary backgrounds to biochemistry" (first keeps id introduction-to-biological-system-review-on-cellular)
- sem 3: Split topic "Properties of water- solubility, ionization property and water as a reactant, pH and buffers and their importance" into "Properties of water- solubility", "ionization property and water as a reactant", "pH and buffers and their importance" (first keeps id properties-of-water-solubility-ionization-property-and-water)
- sem 3: Split topic "Importance of Blood grouping. Lymphatic organs and tissues" into "Importance of Blood grouping", "Lymphatic organs and tissues" (first keeps id importance-of-blood-grouping-lymphatic-organs-and-tissues)
- sem 3: Split topic "Anatomy of respiratory organs and their functions, Regulation, and Mechanism of respiration" into "Hrs Anatomy of respiratory organs and their functions, Regulation", "Mechanism of respiration" (first keeps id anatomy-of-respiratory-organs-and-their-functions-regulation)
- sem 3: Split topic "Classification of nervous system" into "Hrs Classification of nervous system", "Classification of nervous system" (first keeps id classification-of-nervous-system)
- sem 3: Split topic "mid brain. Function of hypothalamus" into "mid brain", "Function of hypothalamus" (first keeps id mid-brain-function-of-hypothalamus)
- sem 3: Split topic "Molecular Taxonomy- 16S rRNA gene sequencing, Phylogenetic grouping" into "Molecular Taxonomy- 16S rRNA gene sequencing", "Phylogenetic grouping" (first keeps id molecular-taxonomy-16s-rrna-gene-sequencing-phylogenetic)
- sem 3: Split topic "Methods to study microbial community: DGGE, SSCP, T-RFLP" into "Methods to study microbial community: DGGE", "SSCP, T-RFLP" (first keeps id methods-to-study-microbial-community-dgge-sscp-t-rflp)
- sem 3: Split topic "slime, capsule, cell wall, pili, flagella, cell inclusions, biosynthesis of bacterial cell wall, cell membrane" into "cell wall, pili, flagella", "cell inclusions", "biosynthesis of bacterial cell wall", "cell membrane" (first keeps id slime-capsule-cell-wall-pili-flagella-cell-inclusions)
- sem 3: Split topic "Types of media- Semi synthetic, Synthetic, Enriched, Enrichment, Selective and Differential media" into "Types of media- Semi synthetic, Synthetic, Enriched, Enrichment", "Selective and Differential media" (first keeps id types-of-media-semi-synthetic-synthetic-enriched-enrichment)
- sem 3: Split topic "Tube dilution, Pour, Spread, Streak plate" into "Tube dilution, Pour, Spread", "Streak plate" (first keeps id tube-dilution-pour-spread-streak-plate)
- sem 3: Split topic "Anaerobic culture technique Wright's Tube, Roll tube method, Anaerobic Jar" into "Anaerobic culture technique Wright's Tube", "Roll tube method", "Anaerobic Jar" (first keeps id anaerobic-culture-technique-wrights-tube-roll-tube-method)
- sem 4: Split topic "Gene regulation in prokaryotes: Lac operon concept, trp concept" into "Gene regulation in prokaryotes: Lac operon concept", "trp concept" (first keeps id lac-trp-operons)
- sem 4: Split topic "Process of recombination. Programmed cell death" into "Process of recombination", "Programmed cell death" (first keeps id process-of-recombination-programmed-cell-death)
- sem 4: Split topic "Molecular basis of mutation and their different types, Microbial genetics: conjugation, transformation, transduction, Plasmids and transposable elements, Chromosomal variation" into "Molecular basis of mutation and their different types", "Microbial genetics: conjugation, transformation, transduction", "Plasmids and transposable elements", "Chromosomal variation" (first keeps id molecular-basis-of-mutation-and-their-different-types)
- sem 4: Split topic "Outline of an integrated bioprocess: Upstream and downstream, Unit operations involved in bioprocesses, Process flow sheets of metabolite production, Microbial kinetics of growth, Modes of bioreactor " into "Outline of an integrated bioprocess: Upstream and downstream", "Unit operations involved in bioprocesses", "Process flow sheets of metabolite production", "Microbial kinetics of growth", "Production kinetics" (first keeps id outline-of-an-integrated-bioprocess-upstream-and-downstream)
- sem 4: Split topic "Fed batch and Continuous operation, Production kinetics, Kinetics of substrate uptake and Yields in cell culture" into "Fed batch and Continuous operation", "Kinetics of substrate uptake and Yields in cell culture" (first keeps id fed-batch-and-continuous-operation-production-kinetics)
- sem 4: Split topic "Design of batch heat sterilization process" into "Design of batch heat sterilization process", "Design of continuous heat sterilization process" (first keeps id design-of-batch-heat-sterilization-process)
- sem 4: Split topic "Bioreactor control mechanism, Physical, Chemical and Biological environment of bioreactor, Role of physical, chemical & biological sensors, Online and offline analytical methods" into "Bioreactor control mechanism, Physical", "Chemical and Biological environment of bioreactor", "Role of physical", "chemical & biological sensors", "Online and offline analytical methods" (first keeps id bioreactor-control-mechanism-physical-chemical-and)
- sem 4: Split topic "Medical Applications of Bioprocess Engineering (Tissue Engineering, Gene Therapy)" into "Medical Applications of Bioprocess Engineering (Tissue Engineering", "Gene Therapy)" (first keeps id medical-applications-of-bioprocess-engineering-tissue)
- sem 4: Split topic "Physiology of digestion and absorption of Nutrients. disorders of GIT. Anatomy and physiology of urinary system" into "Physiology of digestion and absorption of Nutrients. disorders of GIT", "Anatomy and physiology of urinary system" (first keeps id physiology-of-digestion-and-absorption-of-nutrients)
- sem 4: Split topic "Regulation of Renin - angiotensin system" into "Regulation of Renin", "angiotensin system" (first keeps id regulation-of-renin-angiotensin-system)
- sem 4: Split topic "neuromuscular junction. Structural and functional classification" into "neuromuscular junction", "Structural and functional classification" (first keeps id pn-junction-physics)
- sem 4: Split topic "Anatomy of male and female reproductive system" into "Anatomy of male and female reproductive system", "Functions of male and female reproductive system" (first keeps id anatomy-of-male-and-female-reproductive-system)
- sem 4: Split topic "Elementary commands and Protocols, ftp, telnet, http. Databanks" into "Elementary commands and Protocols, ftp, telnet", "http, Databanks" (first keeps id elementary-commands-and-protocols-ftp-telnet-http-databanks)
- sem 4: Split topic "PDB, SCOP, CATH" into "PDB", "SCOP", "CATH" (first keeps id pdb-scop-cath)
- sem 4: Split topic "multiple alignment" into "multiple alignment", "common multiple alignment methods" (first keeps id multiple-alignment)
- sem 4: Split topic "Database search" into "Database search", "Algorithms issues in database search", "sequence database search" (first keeps id database-search)
- sem 4: Split topic "Amino acid substitution matrices PAM250 and BLOSUM62. Mapping and genome project" into "Amino acid substitution matrices PAM250 and BLOSUM62", "Mapping and genome project" (first keeps id amino-acid-substitution-matrices-pam250-and-blosum62-mapping)
- sem 4: Split topic "Protein secondary structure prediction methods, Molecular Docking methods" into "Protein secondary structure prediction methods", "Molecular Docking methods" (first keeps id protein-secondary-structure-prediction-methods-molecular)
- sem 5: Split topic "Laboratory test (Serology, Hematology, Urine & stool)" into "Laboratory test (Serology, Hematology", "Urine & stool)" (first keeps id laboratory-test-serology-hematology-urine-and-stool)
- sem 5: Split topic "Fundamental of radiological assessment. Model case presentation" into "Fundamental of radiological assessment", "Model case presentation" (first keeps id fundamental-of-radiological-assessment-model-case)
- sem 5: Split topic "Environmental degradation, Impact of anthropogenic activities of environment: Land, Water, Air, Forest, Oceans and the coasts" into "Environmental degradation", "Impact of anthropogenic activities of environment: Land, Water, Air, Forest", "Oceans and the coasts" (first keeps id environmental-degradation-impact-of-anthropogenic-activities)
- sem 5: Split topic "Biochemical aspects of arsenic, cadmium, lead, mercury, carbon monoxide, ozone and PAN pesticide" into "Biochemical aspects of arsenic, cadmium, lead, mercury", "carbon monoxide", "ozone and PAN pesticide" (first keeps id biochemical-aspects-of-arsenic-cadmium-lead-mercury-carbon)
- sem 5: Split topic "Mode of entry of toxic substance, its breakdown and detoxification" into "Mode of entry of toxic substance", "its breakdown and detoxification" (first keeps id mode-of-entry-of-toxic-substance-its-breakdown-and)
- sem 5: Split topic "Insecticides / Pesticides in environment, MIC effects" into "Insecticides / Pesticides in environment", "MIC effects" (first keeps id insecticides-pesticides-in-environment-mic-effects)
- sem 5: Split topic "Carcinogens in environment, chemical carcinogenicity, mechanism of carcinogenicity, environmental carcinogenicity testing" into "Carcinogens in environment", "chemical carcinogenicity", "mechanism of carcinogenicity", "environmental carcinogenicity testing" (first keeps id carcinogens-in-environment-chemical-carcinogenicity)
- sem 5: Split topic "Sampling" into "Sampling", "water sampling" (first keeps id sampling)
- sem 5: Split topic "Environment Impact Assessment: EIA complete process, Importance of EIA" into "Environment Impact Assessment: EIA complete process", "Importance of EIA" (first keeps id environment-impact-assessment-eia-complete-process)
- sem 5: Split topic "Bioremediation of VOCs. Factors affecting process of biodegradation" into "Bioremediation of VOCs", "Factors affecting process of biodegradation" (first keeps id bioremediation-of-vocs-factors-affecting-process-of)
- sem 5: Split topic "Tool for protein ligand interaction" into "Tool for protein ligand interaction", "protein interaction" (first keeps id tool-for-protein-ligand-interaction)
- sem 5: Split topic "Methods of sequence based structure prediction" into "Methods of sequence based structure prediction", "Methods of 2-D structure prediction" (first keeps id methods-of-sequence-based-structure-prediction)
- sem 5: Split topic "Homologous modelling. Drug and target discovery technology and strategy" into "Homologous modelling", "Drug and target discovery technology and strategy" (first keeps id homologous-modelling-drug-and-target-discovery-technology)
- sem 5: Split topic "Important parameter for drug discovery. Drug design approaches" into "Important parameter for drug discovery", "Drug design approaches" (first keeps id important-parameter-for-drug-discovery-drug-design)
- sem 5: Split topic "Organization and structure of genomes, Genome size, Introns and Exons, Sequence complexity, Genome structure in prokaryotes / viruses, Retrofitting" into "Genome size", "Introns and Exons", "Sequence complexity", "Genome structure in prokaryotes / viruses, Retrofitting" (first keeps id organization-and-structure-of-genomes-genome-size-introns)
- sem 5: Split topic "The Proteome, Mining proteomes, Bridging Genomics and Proteomics" into "Mining proteomes", "Bridging Genomics and Proteomics" (first keeps id the-proteome-mining-proteomes-bridging-genomics-and)
- sem 5: Split topic "determining gene function by sequence comparison and through conserved protein structure Global expression profiling - Analysis of RNA expression" into "determining gene function by sequence comparison and through conserved protein structure Global expression profiling", "Analysis of RNA expression" (first keeps id determining-gene-function-by-sequence-comparison-and-through)
- sem 5: Split topic "Analysis of proteomes – 2D page and image analysis" into "Analysis of proteomes", "2D page and image analysis" (first keeps id analysis-of-proteomes-2d-page-and-image-analysis)
- sem 5: Split topic "Haematopoiesis, Cells of the immune system, Primary and Secondary lymphoid organs, Characteristics of T and B cell receptors, T and B cell maturation, activation and differentiation" into "Cells of the immune system", "Primary and Secondary lymphoid organs", "Characteristics of T and B cell receptors", "T and B cell maturation", "activation and differentiation" (first keeps id haematopoiesis-cells-of-the-immune-system-primary-and)
- sem 5: Split topic "Antigens: Characteristics and Types of Antigens, Factors affecting the immunogenicity, Haptens, Antigenic Determinants, Adjuvants, Vaccines, Routes of Immunization" into "Antigens: Characteristics and Types of Antigens", "Factors affecting the immunogenicity, Haptens", "Antigenic Determinants, Adjuvants, Vaccines", "Routes of Immunization" (first keeps id antigens-characteristics-and-types-of-antigens-factors)
- sem 5: Split topic "Theory ofclonal selection, Immunoglobulins: Basic structures, classes and sub classes" into "Theory ofclonal selection", "Immunoglobulins: Basic structures", "classes and sub classes" (first keeps id theory-ofclonal-selection-immunoglobulins-basic-structures)
- sem 5: Split topic "Structure, types and function of MHC, Phagocytosis, Exogenous and Endogenous pathways of antigen processing and presentation" into "Structure, types and function of MHC, Phagocytosis", "Exogenous and Endogenous pathways of antigen processing and presentation, Cytokines, function" (first keeps id structure-types-and-function-of-mhc-phagocytosis-exogenous)
- sem 5: Split topic "Self-tolerance and possible mechanisms of induction of autoimmunity, Organ specific and systemic autoimmune diseases, IgE mediated (Type I) hypersensitivity, antibody mediated cytotoxic (Type II) hype" into "Self-tolerance and possible mechanisms of induction of autoimmunity", "Organ specific and systemic autoimmune diseases", "IgE mediated (Type I) hypersensitivity", "antibody mediated cytotoxic (Type II) hypersensitivity" (first keeps id self-tolerance-and-possible-mechanisms-of-induction-of)
- sem 5: Split topic "ELISA. Detection of bacterial endotoxins using immunological methods (LAL Test)" into "ELISA", "Detection of bacterial endotoxins using immunological methods (LAL Test)" (first keeps id elisa-detection-of-bacterial-endotoxins-using-immunological)
- sem 5: Split topic "Chemically defined and serum free media. Laboratory design" into "Chemically defined and serum free media", "Laboratory design" (first keeps id chemically-defined-and-serum-free-media-laboratory-design)
- sem 5: Split topic "Transgene silencing" into "Transgene silencing", "Strategies to avoid transgene silencing" (first keeps id transgene-silencing)
- sem 5: Split topic "advanced technologies – cis genesis and intragenesis" into "advanced technologies", "cis genesis and intragenesis" (first keeps id advanced-technologies-cis-genesis-and-intragenesis)
- sem 5: Split topic "RNAi technology, genome editing technology, CRISPR/Cas" into "RNAi technology", "genome editing technology", "CRISPR/Cas" (first keeps id rnai-technology-genome-editing-technology-crispr-cas)
- sem 5: Split topic "Transgenic Animals and their significance. Ethical issues in transgenic plants and animals" into "Transgenic Animals and their significance", "Ethical issues in transgenic plants and animals" (first keeps id transgenic-animals-and-their-significance-ethical-issues-in)
- sem 6: Split topic "types of infectious diseases. Philosophy and general approach to clinical specimens" into "types of infectious diseases", "Philosophy and general approach to clinical specimens" (first keeps id types-of-infectious-diseases-philosophy-and-general-approach)
- sem 6: Split topic "Human disorders: Biochemical disorders, Immune disorders, chromosomal disorders and single cell disorders" into "Human disorders: Biochemical disorders", "Immune disorders", "chromosomal disorders and single cell disorders" (first keeps id human-disorders-biochemical-disorders-immune-disorders)
- sem 6: Split topic "G-banding, in situ hybridization (FISH and on-FISH), and comparative genomic hybridization (CGH)" into "in situ hybridization (FISH and on-FISH)", "comparative genomic hybridization (CGH)" (first keeps id g-banding-in-situ-hybridization-fish-and-on-fish-and)
- sem 6: Split topic "Wound Healing, and Foreign Body Response" into "Wound Healing", "Foreign Body Response" (first keeps id wound-healing-and-foreign-body-response)
- sem 6: Split topic "types and classification. Membrane processes" into "types and classification", "Membrane processes" (first keeps id types-and-classification-membrane-processes)
- sem 6: Split topic "Inorganic polymers, organic polymers, biodegradable polymers, Photonic polymers, fire retarding polymers, membranes and smart materials" into "Inorganic polymers", "organic polymers", "biodegradable polymers", "Photonic polymers", "fire retarding polymers", "membranes and smart materials" (first keeps id inorganic-polymers-organic-polymers-biodegradable-polymers)
- sem 6: Split topic "Introduction, Nomenclature and Classification of Natural and Synthetic dyes, Color and constitution" into "Introduction, Nomenclature and Classification of Natural and Synthetic dyes", "Color and constitution", "Natural dyes" (first keeps id introduction-nomenclature-and-classification-of-natural-and)
- sem 6: Split topic "chromospheres and auxochromes with suitable examples, Azo dyes" into "chromospheres and auxochromes with suitable examples", "Azo dyes" (first keeps id chromospheres-and-auxochromes-with-suitable-examples-azo)
- sem 6: Split topic "types of azo dyes, synthesis of acidic and basic azo dyes. Natural dyes" into "types of azo dyes", "synthesis of acidic and basic azo dyes" (first keeps id types-of-azo-dyes-synthesis-of-acidic-and-basic-azo-dyes)
- sem 6: Split topic "structure determination and synthesis of alizarine, Quinazarin and Indigo" into "structure determination and synthesis of alizarine", "Quinazarin and Indigo" (first keeps id structure-determination-and-synthesis-of-alizarine)
- sem 6: Split topic "Pigments: Introduction, Structures of Porphyrins, plant pigments and classification, Bile pigments" into "Pigments: Introduction", "Structures of Porphyrins", "plant pigments and classification", "Bile pigments" (first keeps id pigments-introduction-structures-of-porphyrins-plant)
- sem 6: Split topic "in-silico representation of chemical information. Chemical Databases: Data Mining" into "in-silico representation of chemical information", "Chemical Databases: Data Mining" (first keeps id in-silico-representation-of-chemical-information-chemical)
- sem 6: Split topic "Molecular Modeling. Computer-Aided Drug Design: Overview" into "Molecular Modeling", "Computer-Aided Drug Design: Overview" (first keeps id molecular-modeling-computer-aided-drug-design-overview)
- sem 6: Split topic "Docking Tools, and Screening Tools. Chemical data science: Artificial intelligence in chemistry" into "Docking Tools", "Screening Tools", "Chemical data science: Artificial intelligence in chemistry" (first keeps id docking-tools-and-screening-tools-chemical-data-science)
- sem 6: Split topic "in silico tools for medicinal chemistry (docking, MD, de novo drug design)" into "in silico tools for medicinal chemistry (docking", "de novo drug design)" (first keeps id in-silico-tools-for-medicinal-chemistry-docking-md-de-novo)
- sem 6: Split topic "Factors influencing Distribution of Drug, Volume of Distribution and its significance" into "Factors influencing Distribution of Drug", "Volume of Distribution and its significance" (first keeps id factors-influencing-distribution-of-drug-volume-of)
- sem 6: Split topic "Drug interactions: Effect of protein- binding interactions" into "Drug interactions: Effect of protein- binding interactions", "drug interactions linked to drug-drug" (first keeps id drug-interactions-effect-of-protein-binding-interactions)
- sem 6: Split topic "factors modifying drug action. Modified-Release Drug formulations" into "factors modifying drug action", "Modified-Release Drug formulations" (first keeps id factors-modifying-drug-action-modified-release-drug)
- sem 6: Split topic "Introduction to food processing of various foods including dairy, bakery, brewing, fruit and vegetable products, plantation products, oilseeds, meat, fish, poultry" into "Introduction to food processing of various foods including dairy, bakery, brewing", "fruit and vegetable products", "plantation products, oilseeds, meat, fish, poultry" (first keeps id introduction-to-food-processing-of-various-foods-including)
- sem 6: Split topic "Principles of food preservation by dehydration, thermal treatments like pasteurization, sterilization, canning, retorting etc., low temperature i.e., chilling and freezing, chemical preservation/ bio-" into "Principles of food preservation by dehydration", "thermal treatments like pasteurization, sterilization, canning, retorting etc", "low temperature i.e", "chilling and freezing", "chemical preservation/ bio-preservation" (first keeps id principles-of-food-preservation-by-dehydration-thermal)
- sem 6: Split topic "cheese making and whey processing, impact of enzyme technology (bioethanol, protein hydrolysates, bioactive peptides)" into "cheese making and whey processing", "impact of enzyme technology (bioethanol", "protein hydrolysates", "bioactive peptides)" (first keeps id cheese-making-and-whey-processing-impact-of-enzyme)
- sem 6: Split topic "enzymatic processing of fruit juices. Role of enzymes in baking, meat and meat processing" into "enzymatic processing of fruit juices", "Role of enzymes in baking", "meat and meat processing" (first keeps id enzymatic-processing-of-fruit-juices-role-of-enzymes-in)
- sem 6: Split topic "Fermented foods: Dairy products, oriental fermentations, alcoholic beverages, and food ingredients" into "Fermented foods: Dairy products", "oriental fermentations", "alcoholic beverages", "food ingredients" (first keeps id fermented-foods-dairy-products-oriental-fermentations)
- sem 6: Split topic "Starter culture development, process development" into "Starter culture development", "process development" (first keeps id starter-culture-development-process-development)
- sem 6: Split topic "Enzymes in the dairy industry: cheese making and whey processing, impact of enzyme technology" into "Enzymes in the dairy industry: cheese making and whey processing", "impact of enzyme technology" (first keeps id enzymes-in-the-dairy-industry-cheese-making-and-whey)
- sem 6: Split topic "Role of WHO to improve evaluation of GM food, Benefits & Controversies, Irradiated Food, Labelling of Irradiated Food" into "Role of WHO to improve evaluation of GM food", "Benefits & Controversies", "Irradiated Food", "Labelling of Irradiated Food" (first keeps id role-of-who-to-improve-evaluation-of-gm-food-benefits-and)
- sem 6: Split topic "Freeze dried food, Functional Foods & Nutraceuticals, Functional foods from plant sources, animal sources, dietary supplements, Regulation" into "Freeze dried food", "Functional Foods & Nutraceuticals", "Functional foods from plant sources", "animal sources", "dietary supplements, Regulation" (first keeps id freeze-dried-food-functional-foods-and-nutraceuticals)
- sem 6: Split topic "FAO in India, Technical Cooperation programmes, Biosecurity in Food and Agriculture, World Health Organization (WHO), World Animal Health Organization (OIE), International Plant Protection Convention " into "FAO in India", "Technical Cooperation programmes", "Biosecurity in Food and Agriculture", "World Health Organization (WHO)", "World Animal Health Organization (OIE)" (first keeps id fao-in-india-technical-cooperation-programmes-biosecurity-in)
- sem 6: Split topic "Codex Alimentarius Commission - Codex India" into "Codex Alimentarius Commission", "Codex India" (first keeps id codex-alimentarius-commission-codex-india)
- sem 6: Split topic "Role of Codex Contact point, National Codex contact point (NCCP), National Codex Committee of India" into "Role of Codex Contact point", "National Codex contact point (NCCP)" (first keeps id role-of-codex-contact-point-national-codex-contact-point)
- sem 6: Split topic "Exome sequencing and analysis" into "Exome sequencing and analysis", "Exome sequencing" (first keeps id exome-sequencing-and-analysis)
- sem 6: Split topic "pGEM3Z. Cloning vectors based on M13 and λ bacteriophage. Ti plasmid" into "Cloning vectors based on M13 and λ bacteriophage", "Ti plasmid" (first keeps id pgem3z-cloning-vectors-based-on-m13-and-bacteriophage-ti)
- sem 6: Split topic "Ligation of DNA molecules. Introduction of DNA into cells" into "Ligation of DNA molecules", "Introduction of DNA into cells, Transformation" (first keeps id ligation-of-dna-molecules-introduction-of-dna-into-cells)
- sem 6: Split topic "selection for transformed cells. Identification of recombinants" into "selection for transformed cells", "Identification of recombinants" (first keeps id selection-for-transformed-cells-identification-of)
- sem 6: Split topic "blue-white selection. Identification of recombinant phages. cDNA and Genomic libraries" into "blue-white selection", "Identification of recombinant phages. cDNA and Genomic libraries" (first keeps id blue-white-selection-identification-of-recombinant-phages)
- sem 6: Split topic "designing primers for PCR. DNA sequencing by Sanger’s method and automated DNA sequencing" into "designing primers for PCR", "DNA sequencing by Sanger’s method and automated DNA sequencing" (first keeps id designing-primers-for-pcr-dna-sequencing-by-sangers-method)
- sem 6: Split topic "Blotting technique, RT-PCR, In-situ hybridization, RAPD, RFLP, Antisense RNA and Ribozyme technology, CRISPR/Cas9 gene editing, Site-directed mutagenesis and protein engineering" into "Blotting technique", "RT-PCR", "In-situ hybridization", "RAPD", "RFLP", "Antisense RNA and Ribozyme technology", "CRISPR/Cas9 gene editing", "Site-directed mutagenesis and protein engineering" (first keeps id blotting-technique-rt-pcr-in-situ-hybridization-rapd-rflp)
- sem 6: Split topic "mechanical and biological properties. Scaffolds & tissue engineering" into "mechanical and biological properties", "Scaffolds & tissue engineering" (first keeps id mechanical-and-biological-properties-scaffolds-and-tissue)
- sem 6: Split topic "Stem Cells: Introduction" into "Stem Cells: Introduction", "cancer stem cells induced pleuri potent stem cells" (first keeps id stem-cells-introduction)
- sem 6: Split topic "regulation of receptors. Drugs used in congestive heart failure" into "regulation of receptors", "Drugs used in congestive heart failure" (first keeps id regulation-of-receptors-drugs-used-in-congestive-heart)
- sem 7: Split topic "uses and applications. Overview of Pharmaceutical Biotechnology and Biosimilars technology" into "uses and applications", "Overview of Pharmaceutical Biotechnology and Biosimilars technology" (first keeps id uses-and-applications-overview-of-pharmaceutical)
- sem 7: Split topic "Biologics/Biosimilars: A Regulatory Overview, Different expression hosts with history and genotypes Prokaryotes" into "Biologics/Biosimilars: A Regulatory Overview", "Different expression hosts with history and genotypes Prokaryotes" (first keeps id biologics-biosimilars-a-regulatory-overview-different)
- sem 7: Split topic "E.coli DH5 alpha , E.coli BL21A1, E.coli BL21DE3 etc. Eukaryotes" into "E.coli DH5 alpha", "E.coli BL21A1", "E.coli BL21DE3 etc, Eukaryotes" (first keeps id e-coli-dh5-alpha-e-coli-bl21a1-e-coli-bl21de3-etc-eukaryotes)
- sem 7: Split topic "Yeast hosts like Pichia pastoris , Mammalian hosts like CHOK1, CHO DuxB11, CHO DG44, NS0, SP02 cell line" into "Yeast hosts like Pichia pastoris", "Mammalian hosts like CHOK1", "CHO DuxB11", "CHO DG44", "NS0", "SP02 cell line" (first keeps id yeast-hosts-like-pichia-pastoris-mammalian-hosts-like-chok1)
- sem 7: Split topic "Regulatory Compliance for Biopharmaceuticals and Other Biologics, Concepts of non-clinical animal trials and clinical trials on human volunteers (Phase I, II, III, IV clinical trials), Guidelines and " into "Regulatory Compliance for Biopharmaceuticals and Other Biologics", "Concepts of non-clinical animal trials and clinical trials on human volunteers (Phase I", "III", "IV clinical trials)" (first keeps id regulatory-compliance-for-biopharmaceuticals-and-other)
- sem 7: Split topic "Tablets, Capsules, and Granules. II. Semi solid Dosage: Creams" into "Solid Dosage: Powders, Tablets, Capsules, Granules", "Semi solid Dosage: Creams, Gels" (first keeps id tablets-capsules-and-granules-ii-semi-solid-dosage-creams)
- sem 7: Split topic "Ointment and Paste. III. Liquid Dosage: Monophasic (Syrups & Elixirs)" into "Ointment and Paste", "III", "Liquid Dosage: Monophasic (Syrups & Elixirs)" (first keeps id ointment-and-paste-iii-liquid-dosage-monophasic-syrups-and)
- sem 7: Split topic "Rectal and their merits & demerits. Types of impurities in pharmaceuticals" into "Rectal and their merits & demerits", "Types of impurities in pharmaceuticals" (first keeps id rectal-and-their-merits-and-demerits-types-of-impurities-in)
- sem 7: Split topic "Genetic Circuits in Eukaryotes: How to build genetic circuits in yeast Logic gates in yeast Scale up to mammalian cells, Introduction to non-coding RNAs, ncRNAs Characteristics, biogenesis, and activi" into "Hrs, Genetic Circuits in Eukaryotes: How to build genetic circuits in yeast Logic gates in yeast Scale up to mammalian cells", "Introduction to non-coding RNAs", "ncRNAs Characteristics, biogenesis" (first keeps id genetic-circuits-in-eukaryotes-how-to-build-genetic-circuits)
- sem 7: Split topic "Protein–protein interaction networks" into "Protein–protein interaction networks", "Gene regulatory networks (DNA–protein interaction networks)" (first keeps id protein-protein-interaction-networks)
- sem 7: Split topic "feedback regulation" into "feedback regulation", "concerted feedback regulation", "cumulative feedback regulation" (first keeps id feedback-regulation)
- sem 7: Split topic "Biochemistry and process parameters of biomethanation" into "Biochemistry and process parameters of biomethanation", "Biomethanation Process" (first keeps id biochemistry-and-process-parameters-of-biomethanation)
- sem 7: Split topic "gasifier design : TDR, throughput, A/F ratio and equivalence ratio calculations" into "gasifier design : TDR, throughput", "A/F ratio and equivalence ratio calculations" (first keeps id gasifier-design-tdr-throughput-a-f-ratio-and-equivalence)
- sem 7: Split topic "Eutectic point of biomass ash. Chemical Conversion: Hydrolysis & hydrogenation" into "Eutectic point of biomass ash", "Chemical Conversion: Hydrolysis & hydrogenation" (first keeps id eutectic-point-of-biomass-ash-chemical-conversion-hydrolysis)
- sem 7: Split topic "organogenesis and morphogenesis, metamorphosis, animal life cycle, sex determination and role of apoptosis in organ development" into "organogenesis and morphogenesis, metamorphosis", "animal life cycle", "sex determination and role of apoptosis in organ development" (first keeps id organogenesis-and-morphogenesis-metamorphosis-animal-life)
- sem 7: Split topic "Concept of anteroposterior, dorso-ventral, and medio-lateral axis formation" into "Concept of anteroposterior", "dorso-ventral", "medio-lateral axis formation" (first keeps id concept-of-anteroposterior-dorso-ventral-and-medio-lateral)
- sem 7: Split topic "Force Fields, Bond Stretching, Angle Bending, Torsional Terms, Introduction to Non-bonded Interactions: Electrostatic Interactions" into "Force Fields", "Bond Stretching", "Angle Bending", "Torsional Terms", "Introduction to Non-bonded Interactions: Electrostatic Interactions" (first keeps id force-fields-bond-stretching-angle-bending-torsional-terms)
- sem 7: Split topic "Vander Waals Interactions, Hydrogen Bonding in Molecular Mechanics, Force Field Models for the Simulation of Liquid Water" into "Vander Waals Interactions", "Hydrogen Bonding in Molecular Mechanics", "Force Field Models for the Simulation of Liquid Water" (first keeps id vander-waals-interactions-hydrogen-bonding-in-molecular)
- sem 7: Split topic "Introduction and the need for intellectual property right (IPR) - Kinds of Intellectual Property Rights: Patent, Copyright, Trade Mark, Design, Geographical Indication, Plant Varieties and Layout Desi" into "Introduction and the need for intellectual property right (IPR)", "Kinds of Intellectual Property Rights: Patent, Copyright", "Trade Mark, Design", "Geographical Indication", "Plant Varieties and Layout Design" (first keeps id introduction-and-the-need-for-intellectual-property-right)
- sem 7: Split topic "Trade Secret - IPR in India: Genesis and development" into "Trade Secret", "IPR in India: Genesis and development" (first keeps id trade-secret-ipr-in-india-genesis-and-development)
- sem 7: Split topic "IPR in abroad - Major International Instruments concerning Intellectual Property Rights" into "IPR in abroad", "Major International Instruments concerning Intellectual Property Rights, Plagiarism" (first keeps id ipr-in-abroad-major-international-instruments-concerning)
- sem 7: Split topic "Registration of Design. TRADE MARKS— Origin" into "Registration of Design", "TRADE MARKS— Origin", "Registration of Trade Marks" (first keeps id registration-of-design-trade-marks-origin)
- sem 7: Split topic "Biosafety Levels" into "Biosafety Levels", "Biosafety Levels of Specific Microorganisms" (first keeps id biosafety-levels)
- sem 7: Split topic "Applications of Nanoscale materials: Catalysis, Sensing, Energy storage, Environmental remediation, etc" into "Applications of Nanoscale materials: Catalysis, Sensing", "Energy storage", "Environmental remediation, etc" (first keeps id applications-of-nanoscale-materials-catalysis-sensing-energy)
- sem 7: Split topic "Energy Conversion and Storage (solar cells, Fuel Cells, Li/Na-ion Batteries)" into "Energy Conversion and Storage (solar cells", "Fuel Cells", "Li/Na-ion Batteries)" (first keeps id energy-conversion-and-storage-solar-cells-fuel-cells-li-na)
- sem 7: Split topic "Nanoscale materials for waste reduction and improved energy efficiency, nanotechnology-based water treatment strategies" into "Nanoscale materials for waste reduction and improved energy efficiency", "nanotechnology-based water treatment strategies" (first keeps id nanoscale-materials-for-waste-reduction-and-improved-energy)
- sem 7: Split topic "Flocculation and sedimentation, Centrifugation-differential and density gradient" into "Flocculation and sedimentation", "Centrifugation-differential and density gradient" (first keeps id flocculation-and-sedimentation-centrifugation-differential)
- sem 7: Split topic "Filtration: incompressible and compressible cakes, Pre-treatment of fermentation broth, Filter media and equipment for batch and continuous Filtration" into "Filtration: incompressible and compressible cakes", "Pre-treatment of fermentation broth", "Filter media and equipment for batch and continuous Filtration" (first keeps id filtration-incompressible-and-compressible-cakes-pre)
- sem 7: Split topic "Membrane separation processes: Basic principles and advantages, Modes of operation, Pressure-driven processes (MF, UF, NF & RO), Concentration-driven processes (Dialysis &Pervaporation), and Electrica" into "Membrane separation processes: Basic principles and advantages", "Modes of operation", "Pressure-driven processes (MF", "NF & RO)", "Concentration-driven processes (Dialysis &Pervaporation)" (first keeps id membrane-separation-processes-basic-principles-and)
- sem 7: Split topic "Extraction processes - solvent extraction principles" into "Extraction processes", "solvent extraction principles" (first keeps id extraction-processes-solvent-extraction-principles)
- sem 7: Split topic "reverse micellar, and supercritical fluid extraction. Colloidal stability of protein solutions" into "reverse micellar", "supercritical fluid extraction", "Colloidal stability of protein solutions" (first keeps id reverse-micellar-and-supercritical-fluid-extraction)

</details>

<details><summary>extra item not in any handout (10)</summary>

- sem 2: Retire topic "Total derivatives" in chapter "Functions of Several Variables"
- sem 2: Retire topic "Axioms, Interpretations and Properties of Probability" in chapter "Probability and Distribution"
- sem 2: Retire topic "the credits shown here follow the official course structure table" in chapter "IKS and Other Disciplines"
- sem 3: Retire topic "Characteristics and functions Hrs of Blood cells" in chapter "Blood and Lymphatic system"
- sem 3: Retire topic "Anatomy and physiology of Hrs cerebrum" in chapter "Nervous system and Sense organs"
- sem 5: Retire topic "Ultrasound, MR, CT" in chapter "Radiology and Advanced Imaging Technology"
- sem 6: Retire topic "Total Hip Replacement" in chapter "Bio-implants"
- sem 6: Retire topic "Total Knee Replacement" in chapter "Bio-implants"
- sem 6: Retire topic "Anti- arrhythmic drugs" in chapter "Structure Activity Relationships"
- sem 7: Retire topic "the credits shown here follow the official course structure table" in chapter "Clinical Trials"

</details>

### chem

<details><summary>course missing from branch/semester (14)</summary>

- sem 1: Link pdeu-mathematics-1-ict to chem sem 1 (code 24MA101T)
- sem 1: Link pdeu-english-communication-ce-biotech to chem sem 1 (code 24HS101T)
- sem 1: Link pdeu-computer-programming-i-ce to chem sem 1 (code 24CP101T)
- sem 1: Link pdeu-chemistry-ece-civil to chem sem 1 (name 1.00, topics 0.35)
- sem 1: Link pdeu-elements-of-electrical-and-electronics-engineering-biotech to chem sem 1 (code 24EE101T)
- sem 1: Link pdeu-organizational-behavior to chem sem 1 (code 24HS104T)
- sem 2: Link pdeu-professional-communication-ce-biotech to chem sem 2 (code 24HS105T)
- sem 2: Link pdeu-mathematics-2-ict to chem sem 2 (code 24MA103T)
- sem 2: Link pdeu-computer-programming-ii-ce to chem sem 2 (code 24CP102T)
- sem 2: Link pdeu-modern-physics-biotech to chem sem 2 (code 24PH103T)
- sem 2: Link lab pdeu-engineering-graphics-ce-petro to chem sem 2 (code 24ME102P)
- sem 2: Link pdeu-environment-science-ce-ece to chem sem 2 (code 24CV101T)
- sem 2: Link pdeu-universal-human-values-ce to chem sem 2 (code 24HS102T)
- sem 2: Link pdeu-indian-knowledge-system-biotech to chem sem 2 (code 24HS103T)

</details>

<details><summary>new course (36)</summary>

- sem 1: Add course "Biological Systems for Engineers" (24BT101T, 4 units): same name as pdeu-biological-systems-for-engineers, but only 39% of its topics are in it
- sem 3: Add course "Mathematics - III" (24MA201T, 4 units): same name as pdeu-mathematics-3-civil, but only 43% of its topics are in it
- sem 3: Add course "Introduction to Artificial Intelligence" (24CH202T, 4 units): same name as pdeu-introduction-to-artificial-intelligence-biotech, but only 20% of its topics are in it
- sem 3: Add course "Chemical Process Calculations" (24CH203T, 4 units)
- sem 3: Add course "Mechanical Unit Operations" (24CH204T, 4 units)
- sem 3: Add course "Fluid Mechanics" (24CH205T, 4 units): same name as pdeu-fluid-mechanics-with-lab, but only 11% of its topics are in it
- sem 4: Add course "Chemical Engineering Industry 4.0" (24CH206T, 4 units): same name as pdeu-industry-4-0-department-specific-ce, but only 43% of its topics are in it
- sem 4: Add course "Heat Transfer" (24CH207T, 4 units)
- sem 4: Add course "Chemical Process Technology" (24CH208T, 4 units)
- sem 4: Add course "Introduction to Numerical Methods for Chemical Engineers" (24CH209T, 4 units)
- sem 4: Add course "Chemical Engineering Thermodynamics" (24CH210T, 4 units)
- sem 5: Add course "Engineering Economics" (24HS301T, 4 units)
- sem 5: Add course "Mass Transfer - 1" (24CH301T, 4 units)
- sem 5: Add course "Chemical Reaction Engineering - 1" (24CH302T, 4 units)
- sem 5: Add course "Process Equipment Design" (24CH303T, 4 units)
- sem 5: Add course "Petroleum Refining and Petrochemicals" (24CH331T, 4 units)
- sem 5: Add course "Renewable Energy Engineering" (24CH332T, 4 units)
- sem 5: Add course "Sustainable and Green Chemistry" (24CH333T, 4 units)
- sem 6: Add course "Instrumentation and Process Control" (24CH304T, 4 units)
- sem 6: Add course "Chemical Reaction Engineering - 2" (24CH305T, 4 units)
- sem 6: Add course "Mass Transfer - 2" (24CH306T, 4 units)
- sem 6: Add course "Piping Design" (24CH334T, 4 units)
- sem 6: Add course "Corrosion Engineering" (24CH335T, 4 units)
- sem 6: Add course "Material Science & Engineering" (24CH336T, 4 units)
- sem 6: Add course "Nano Technology & Energy Storage" (24CH337T, 4 units)
- sem 6: Add course "Membrane Processes" (24CH338T, 4 units)
- sem 6: Add course "Environmental Engineering and Pollution Control" (24CH339T, 4 units)
- sem 7: Add course "Process Modelling and Optimization" (24CH401T, 4 units)
- sem 7: Add course "Transport Phenomena" (24CH402T, 4 units)
- sem 7: Add course "Computer Aided Process Design" (24CH403T, 4 units)
- sem 7: Add course "Polymer Science & Technology" (24CH431T, 4 units)
- sem 7: Add course "Energy Conversion Device Engineering" (24CH432T, 4 units)
- sem 7: Add course "Pharmaceuticals Technology" (24CH433T, 4 units)
- sem 7: Add course "Process Plant Safety, Health and Hygiene" (24CH434T, 4 units)
- sem 7: Add course "Project Management" (24CH435T, 4 units): same name as pdeu-project-management-with-lab, but only 11% of its topics are in it
- sem 7: Add course "Plant Design & Process Economics" (24CH436T, 4 units)

</details>

<details><summary>new practical course (20)</summary>

- sem 1: Add lab "Computer Programming - I Laboratory" (9 experiments), related to Computer Programming - I
- sem 1: Add lab "Engineering Chemistry Laboratory" (11 experiments), related to Engineering Chemistry
- sem 1: Add lab "Elements of Electrical and Electronics Engineering Laboratory" (14 experiments), related to Elements of Electrical and Electronics Engineering
- sem 2: Add lab "Computer Programming - II Laboratory" (8 experiments), related to Computer Programming - II
- sem 2: Add lab "Modern Physics Laboratory" (15 experiments), related to Modern Physics
- sem 2: Add lab "Workshop Practices" (10 experiments)
- sem 3: Add lab "Mechanical Unit Operations Laboratory" (12 experiments), related to Mechanical Unit Operations
- sem 3: Add lab "Fluid Mechanics Laboratory" (12 experiments), related to Fluid Mechanics
- sem 4: Add lab "Chemical Engineering Industry 4.0 Laboratory" (10 experiments), related to Chemical Engineering Industry 4.0
- sem 4: Add lab "Heat Transfer Laboratory" (12 experiments), related to Heat Transfer
- sem 4: Add lab "Chemical Process Technology Laboratory" (13 experiments), related to Chemical Process Technology
- sem 4: Add lab "Chemical Engineering Thermodynamics Laboratory" (11 experiments), related to Chemical Engineering Thermodynamics
- sem 5: Add lab "Mass Transfer - 1 Laboratory" (8 experiments), related to Mass Transfer - 1
- sem 5: Add lab "Chemical Reaction Engineering - 1 Laboratory" (8 experiments), related to Chemical Reaction Engineering - 1
- sem 5: Add lab "Process Equipment Design Laboratory" (10 experiments), related to Process Equipment Design
- sem 6: Add lab "Instrumentation and Process Control Laboratory" (12 experiments), related to Instrumentation and Process Control
- sem 6: Add lab "Chemical Reaction Engineering - 2 Laboratory" (11 experiments), related to Chemical Reaction Engineering - 2
- sem 6: Add lab "Mass Transfer - 2 Laboratory" (10 experiments), related to Mass Transfer - 2
- sem 7: Add lab "Process Modelling and Optimization Laboratory" (12 experiments), related to Process Modelling and Optimization
- sem 7: Add lab "Computer Aided Process Design Laboratory" (13 experiments), related to Computer Aided Process Design

</details>

### civil

<details><summary>course missing from branch/semester (2)</summary>

- sem 1: Link pdeu-environmental-science-biotech to civil sem 1 (name 1.00, topics 0.46)
- sem 2: Link pdeu-elements-of-electrical-and-electronics-engineering-biotech to civil sem 2 (name 1.00, topics 0.46)

</details>

<details><summary>new practical course (17)</summary>

- sem 1: Add lab "Physics Laboratory" (15 experiments), related to Physics
- sem 1: Add lab "Workshop Practice" (10 experiments)
- sem 1: Add lab "Introduction to Computer Programming -I Laboratory (For ME, CL, CH, BT)" (10 experiments), related to Introduction to Computer Programming -I (For ME/CH/CL/BT)
- sem 2: Add lab "Engineering Chemistry Laboratory" (11 experiments), related to Engineering Chemistry
- sem 2: Add lab "Elements of Electrical and Electronics Engineering Laboratory" (13 experiments), related to Elements of Electrical and Electronics Engineering
- sem 2: Add lab "Engineering Graphics - Laboratory" (9 experiments)
- sem 2: Add lab "Introduction to Computer Programming II Laboratory (For ME/CL/CH/BT)" (9 experiments)
- sem 3: Add lab "Building Planning and Computer Aided Drawing Lab" (8 experiments), related to Building Planning and Computer Aided Drawing
- sem 3: Add lab "Material Testing Laboratory" (14 experiments)
- sem 4: Add lab "Fluid Mechanics Laboratory" (10 experiments), related to Fluid Mechanics
- sem 4: Add lab "Engineering Geology and Soil Mechanics Laboratory" (13 experiments), related to Engineering Geology and Soil Mechanics
- sem 4: Add lab "Surveying Practices Laboratory" (14 experiments), related to Surveying Practices
- sem 5: Add lab "Hydrology and Water Resources Engineering laboratory" (10 experiments), related to Hydrology and Water Resources Engineering
- sem 5: Add lab "Foundations and Geotechnical Application Laboratory" (10 experiments)
- sem 6: Add lab "Computer Aided Design Drawing Laboratory - Ii" (13 experiments)
- sem 6: Add lab "Highway and Traffic Engineering Laboratory" (14 experiments), related to Highway and Traffic Engineering
- sem 7: Add lab "Project Management Laboratory" (4 experiments), related to Project Management

</details>

<details><summary>topic missing (18)</summary>

- sem 1: Add topic "Highthroughput diagnostics in clinics: Molecular Diagnostics (PCR)" to chapter "Engineering Perspectives of Biological Sciences" [course shared with ece]
- sem 2: Add topic "Linear differential equations of second order with variable coefficients" to chapter "Ordinary Differential Equations with Applications" [course shared with ce, ece]
- sem 3: Add topic "onedimensional heat equation" to chapter "Partial Differential Equations"
- sem 3: Add topic "silica fume, metakaolin, their production, properties" to chapter "Concrete Ingredients"
- sem 4: Add topic "Properties of Fluid, Density" to chapter "Fundamentals of Fluid Mechanics"
- sem 4: Add topic "Pressure Measurement, Manometers" to chapter "Fundamentals of Fluid Mechanics"
- sem 4: Add topic "Metacentre and Metacentric Height, Determination" to chapter "Fundamentals of Fluid Mechanics"
- sem 4: Add topic "Practical Application of Bernoulli’s Equation, Venturimeter" to chapter "Fluid Kinematics and Dynamics"
- sem 4: Add topic "Flow Through Pipes, Series, Compound, Equivalent, Parallel" to chapter "Pipe Flow"
- sem 4: Add topic "Computation of area of regular and irregular boundary computation of volume for earthwork in cutting & filling" to chapter "Triangulation and Curve Setting"
- sem 4: Add topic "Field Procedure for total station survey" to chapter "Modern Field Survey Systems"
- sem 4: Add topic "Errors in Total Station Survey" to chapter "Modern Field Survey Systems"
- sem 6: Add topic "Rigid pavement- Westergaard’s equations for load and temperature stresses- Design of slab thickness only as per IRC: 58-" to chapter "Pavement Materials and Pavement Design"
- sem 6: Add topic "Different types of Flexible and Rigid pavement failures and pavement management methods" to chapter "Pavement Materials and Pavement Design"
- sem 7: Add topic "Introduction- Parameters affecting a project- Project planning & implementation cycle- Concept & scope of project manage, Feasibility, Development" to chapter "Concept, Scope of Project Management and Phases of Project Life Cycle"
- sem 7: Add topic "Implementation and Operation" to chapter "Concept, Scope of Project Management and Phases of Project Life Cycle"
- sem 7: Add topic "Factors responsible for organizational revolution- Formal & informal organization structuresRequirements of a project or" to chapter "Project Planning and Scheduling"
- sem 7: Add topic "Time cost trade-off planning for minimum costs- Cost slope concept- Crash point- Normal Point- Total project costControl" to chapter "Probabilistic Tools for Project Scheduling and Project Control"

</details>

<details><summary>topic split (106)</summary>

- sem 1: Split topic "Taylor’s series, Convergence of power series" into "Taylor’s series", "Convergence of power series" (first keeps id power-series) [course shared with ce, ece]
- sem 1: Split topic "Definition and evaluation of double integral (Cartesian - Polar form)" into "Definition and evaluation of double integral (Cartesian", "Polar form)" (first keeps id double-integrals) [course shared with ce, ece]
- sem 1: Split topic "Simple problems on line, surface and volume integrals" into "Simple problems on line", "surface and volume integrals" (first keeps id line-integrals) [course shared with ce, ece]
- sem 1: Split topic "Green’s theorem in a plane, Gauss divergence theorem and Stokes’ theorem (without proofs)" into "Green’s theorem in a plane", "Gauss divergence theorem and Stokes’ theorem (without proofs)" (first keeps id divergence-theorem) [course shared with ce, ece]
- sem 1: Split topic "Alternating series – Leibnitz test" into "Alternating series", "Leibnitz test" (first keeps id alternating-series-leibnitz-test) [course shared with ce, ece]
- sem 1: Split topic "Properties of solids" into "Properties of solids", "Magnetic properties of solids" (first keeps id properties-of-solids)
- sem 1: Split topic "Simple harmonic motion" into "Simple harmonic motion", "Damped simple harmonic motion" (first keeps id simple-harmonic-motion)
- sem 1: Split topic "Energy Transport in Wave motion. Acoustics & Ultrasonic: Introduction to Sound" into "Energy Transport in Wave motion", "Acoustics & Ultrasonic: Introduction to Sound" (first keeps id energy-transport-in-wave-motion-acoustics-and-ultrasonic)
- sem 1: Split topic "Ultrasonic waves" into "Ultrasonic waves", "Properties and applications of ultrasonic waves" (first keeps id ultrasonic-waves)
- sem 1: Split topic "Thermal Radiation – emission and absorption radiation" into "Thermal Radiation", "emission and absorption radiation" (first keeps id thermal-radiation-emission-and-absorption-radiation)
- sem 1: Split topic "Cell as a basic unit of life, prokaryotic and eukaryotic cells, microbes, plant and animal cells" into "Cell as a basic unit of life", "prokaryotic and eukaryotic cells, microbes", "plant and animal cells" (first keeps id cell-as-a-basic-unit-of-life-prokaryotic-and-eukaryotic) [course shared with ece]
- sem 1: Split topic "Cell organelles – structure and function" into "Cell organelles", "structure and function" (first keeps id cell-organelles-structure-and-function) [course shared with ece]
- sem 1: Split topic "Vitamins and Minerals, Carbohydrates, Lipids, Amino Acids and proteins, Nucleic Acids (DNA and RNA)" into "Vitamins and Minerals, Carbohydrates, Lipids", "Amino Acids and proteins", "Nucleic Acids (DNA and RNA)" (first keeps id vitamins-and-minerals-carbohydrates-lipids-amino-acids-and) [course shared with ece]
- sem 1: Split topic "Brain as a CPU system (architecture, CNS and Peripheral Nervous System, signal transmission, EEG, Robotic arms for prosthetics)" into "Brain as a CPU system (architecture", "CNS and Peripheral Nervous System", "signal transmission", "EEG", "Robotic arms for prosthetics)" (first keeps id brain-as-a-cpu-system-architecture-cns-and-peripheral) [course shared with ece]
- sem 1: Split topic "The ear and nose as signal transmission models. Lungs operate as an exchange model" into "The ear and nose as signal transmission models", "Lungs operate as an exchange model" (first keeps id the-ear-and-nose-as-signal-transmission-models-lungs-operate) [course shared with ece]
- sem 1: Split topic "kidneys function as a filtration system. Echolocation (ultrasonography, sonars)" into "kidneys function as a filtration system", "Echolocation (ultrasonography, sonars)" (first keeps id kidneys-function-as-a-filtration-system-echolocation) [course shared with ece]
- sem 1: Split topic "Photosynthesis (photovoltaic cells, bionic leaf). Bird flying (GPS and aircrafts)" into "Photosynthesis (photovoltaic cells", "bionic leaf)", "Bird flying (GPS and aircrafts)" (first keeps id photosynthesis-photovoltaic-cells-bionic-leaf-bird-flying) [course shared with ece]
- sem 1: Split topic "Bio printing techniques and materials. Applications of Bioinformatics" into "Bio printing techniques and materials", "Applications of Bioinformatics" (first keeps id bio-printing-techniques-and-materials-applications-of) [course shared with ece]
- sem 1: Split topic "At cell level: Hybridoma technology, At tissue level: Plant Tissue Culture, Animal Tissue Culture" into "At cell level: Hybridoma technology", "At tissue level: Plant Tissue Culture", "Animal Tissue Culture" (first keeps id at-cell-level-hybridoma-technology-at-tissue-level-plant) [course shared with ece]
- sem 1: Split topic "switch statement, and Loop Structure- for loop" into "switch statement", "Loop Structure- for loop" (first keeps id switch-statement-and-loop-structure-for-loop)
- sem 1: Split topic "while loop" into "while loop", "do-while loop" (first keeps id loops)
- sem 1: Split topic "Pointer" into "Pointer arithmetic", "Pointer to pointer" (first keeps id pointer)
- sem 2: Split topic "Rank of a matrix, consistency of system of equation" into "Rank of a matrix", "consistency of system of equation" (first keeps id rank-of-matrix) [course shared with ce, ece]
- sem 2: Split topic "Simultaneous linear equations with constant coefficients, applications of higher-order differential equations in solving engineering problems" into "Differential equations of Higher-order differential equations with constant coefficients", "Simultaneous linear equations with constant coefficients", "applications of higher-order differential equations in solving engineering problems" (first keeps id simultaneous-linear-equations-with-constant-coefficients) [course shared with ce, ece]
- sem 2: Split topic "metallic materials, polymeric, ceramic materials Advanced Materials: Introduction to nanomaterials: Properties and application" into "metallic materials, polymeric", "ceramic materials Advanced Materials: Introduction to nanomaterials: Properties and application" (first keeps id metallic-materials-polymeric-ceramic-materials-advanced) [course shared with ece]
- sem 2: Split topic "Carbonaceous materials (fullerene, carbon nanotube, graphene, etc.)" into "Carbonaceous materials (fullerene", "carbon nanotube, graphene, etc.)" (first keeps id carbonaceous-materials-fullerene-carbon-nanotube-graphene) [course shared with ece]
- sem 2: Split topic "Instrumentation, principle and characterization of materials: X-ray diffraction (XRD), Electro analytical techniques" into "Instrumentation, principle and characterization of materials: X-ray diffraction (XRD)", "Electro analytical techniques" (first keeps id instrumentation-principle-and-characterization-of-materials) [course shared with ece]
- sem 2: Split topic "FTIR, UV- visible spectroscopy" into "FTIR", "UV- visible spectroscopy" (first keeps id ftir-uv-visible-spectroscopy) [course shared with ece]
- sem 2: Split topic "Adsorption - Characteristics, Classification, Application , Adsorption isotherms- Freundlich, Langmuir & BET Chemical Kinetics - Rate law, Arrhenius equation, Transition state theory, Collision theory" into "Adsorption, Characteristics, Classification, Application", "Adsorption isotherms- Freundlich", "Langmuir & BET Chemical Kinetics", "Rate law", "Arrhenius equation", "Transition state theory", "Collision theory" (first keeps id adsorption-characteristics-classification-application) [course shared with ece]
- sem 2: Split topic "Complex reactions Catalysis - Homogeneous and Heterogeneous Catalysis" into "Complex reactions Catalysis", "Homogeneous and Heterogeneous Catalysis" (first keeps id complex-reactions-catalysis-homogeneous-and-heterogeneous) [course shared with ece]
- sem 2: Split topic "Principles of primary and secondary batteries, Fuel Cells and their operation principles, Principles and uses of supercapacitors" into "Principles of primary and secondary batteries", "Fuel Cells and their operation principles", "Principles and uses of supercapacitors" (first keeps id principles-of-primary-and-secondary-batteries-fuel-cells-and) [course shared with ece]
- sem 2: Split topic "If-else statements" into "If-else statements", "Nested If-else statements" (first keeps id if-else-statements)
- sem 3: Split topic "frequency shifting, and convolution properties" into "frequency shifting", "convolution properties" (first keeps id frequency-shifting-and-convolution-properties)
- sem 3: Split topic "communication systems, and quantum mechanics" into "communication systems", "quantum mechanics" (first keeps id communication-systems-and-quantum-mechanics)
- sem 3: Split topic "wave equation, and Laplace equation" into "wave equation", "Laplace equation" (first keeps id wave-equation-and-laplace-equation)
- sem 3: Split topic "Applications in Engineering: Predictive maintenance, quality control, design optimization, autonomous systems" into "Applications in Engineering: Predictive maintenance", "quality control", "design optimization", "autonomous systems" (first keeps id applications-in-engineering-predictive-maintenance-quality)
- sem 3: Split topic "Ethical and Social Implications: Bias, privacy, job displacement" into "Ethical and Social Implications: Bias, privacy", "job displacement" (first keeps id ethical-and-social-implications-bias-privacy-job)
- sem 3: Split topic "Descriptive Statistics (Mean, Median, variance etc) with NumPy and Pandas" into "Descriptive Statistics (Mean, Median", "variance etc) with NumPy and Pandas" (first keeps id descriptive-statistics-mean-median-variance-etc-with-numpy)
- sem 3: Split topic "Visualization (Line Plot, Scatter Plot, Bar Chart, Histogram, Pie Chart, Box Plot, Heatmap, Area Plot, Contour Plot)" into "Visualization (Line Plot", "Scatter Plot", "Bar Chart, Histogram", "Pie Chart", "Box Plot, Heatmap", "Area Plot", "Contour Plot)" (first keeps id visualization-line-plot-scatter-plot-bar-chart-histogram-pie)
- sem 3: Split topic "Real-World Case Studies and Examples, Hands-On Exercises using Python/R etc" into "Real-World Case Studies and Examples", "Hands-On Exercises using Python/R etc" (first keeps id real-world-case-studies-and-examples-hands-on-exercises)
- sem 3: Split topic "Introduction to Machine Learning, ML Techniques: Supervised Learning, Unsupervised Learning and Reinforcement Learning" into "Introduction to Machine Learning", "ML Techniques: Supervised Learning", "Unsupervised Learning and Reinforcement Learning" (first keeps id types-of-learning)
- sem 3: Split topic "ML applications across different sectors, ML Data Preparation, Training and Test Sets, Regression Models (Linear Regression, Decision Tree, Random Forest, Support Vector etc)" into "ML applications across different sectors", "ML Data Preparation", "Training and Test Sets", "Regression Models (Linear Regression", "Decision Tree", "Random Forest", "Support Vector etc)" (first keeps id linear-regression-ml)
- sem 3: Split topic "Working Principles of Unsupervised and Supervised Classification Algorithms: K- Nearest Neighbor, Linear Regression, Logistic Regression, Support Vector Machine" into "Working Principles of Unsupervised and Supervised Classification Algorithms: K- Nearest Neighbor", "Linear Regression", "Logistic Regression", "Support Vector Machine" (first keeps id logistic-regression)
- sem 3: Split topic "Clustering Algorithms: Hierarchical, Agglomerative Clustering, Partitional etc" into "Clustering Algorithms: Hierarchical", "Agglomerative Clustering, Partitional etc" (first keeps id clustering-algorithms-hierarchical-agglomerative-clustering)
- sem 3: Split topic "Confusion Matrix, Accuracy Assessment, Hyperparameters" into "Confusion Matrix", "Accuracy Assessment, Hyperparameters" (first keeps id confusion-matrix-accuracy-assessment-hyperparameters)
- sem 3: Split topic "aggregates types and properties. Artificial: cement types and properties" into "aggregates types and properties", "Artificial: cement types and properties" (first keeps id aggregates-types-and-properties-artificial-cement-types-and)
- sem 3: Split topic "concrete blocks (LWC, AAC) admixtures" into "concrete blocks (LWC", "AAC) admixtures" (first keeps id concrete-blocks-lwc-aac-admixtures)
- sem 3: Split topic "termite proofing, and fire proof" into "termite proofing", "fire proof" (first keeps id termite-proofing-and-fire-proof)
- sem 3: Split topic "Perspective Drawing: Necessity, Principles and Characteristics of Perspective Drawing Terminology Related with Perspective Drawing, Classification of Perspective Drawing" into "Perspective Drawing: Necessity", "Principles and Characteristics of Perspective Drawing Terminology Related with Perspective Drawing", "Classification of Perspective Drawing" (first keeps id perspective-drawing-necessity-principles-and-characteristics)
- sem 3: Split topic "Planning of Public Building (School, Bank, Commercial Complex, etc- Two Point Perspective Drawing" into "Planning of Public Building (School, Bank", "Commercial Complex", "etc- Two Point Perspective Drawing" (first keeps id planning-of-public-building-school-bank-commercial-complex)
- sem 3: Split topic "Particle shape & texture –, strength & other mechanical properties of aggregate" into "Particle shape & texture", "strength & other mechanical properties of aggregate" (first keeps id particle-shape-and-texture-strength-and-other-mechanical)
- sem 3: Split topic "Specific gravity, Bulk density, porosity, adsorption & moisture content of aggregate" into "Specific gravity", "Bulk density, porosity", "adsorption & moisture content of aggregate" (first keeps id porosity)
- sem 3: Split topic "MINERAL ADMIXTURES: Introduction to supplementary cementing materials, sustainability and pozzolans" into "MINERAL ADMIXTURES: Introduction to supplementary cementing materials", "sustainability and pozzolans" (first keeps id mineral-admixtures-introduction-to-supplementary-cementing)
- sem 3: Split topic "particle packing density, Cement Mortars, Mortar specifications, types and tests of mortars" into "particle packing density", "Cement Mortars", "Mortar specifications", "types and tests of mortars" (first keeps id particle-packing-density-cement-mortars-mortar)
- sem 3: Split topic "Extreme weather concreting, special concreting methods" into "Extreme weather concreting", "special concreting methods" (first keeps id extreme-weather-concreting-special-concreting-methods)
- sem 3: Split topic "Tensile strength, Flexural Strength and Bond Strength – direct and indirect" into "Tensile strength", "Flexural Strength and Bond Strength", "direct and indirect" (first keeps id tensile-strength-flexural-strength-and-bond-strength-direct)
- sem 3: Split topic "Introduction to durability: relation between durability and permeability, Chemical attack of concrete corrosion of steel rebar, other durability issues" into "Introduction to durability: relation between durability and permeability", "Chemical attack of concrete corrosion of steel rebar", "other durability issues" (first keeps id introduction-to-durability-relation-between-durability-and)
- sem 3: Split topic "codal provisions for NDT. Elasticity, Creep & Shrinkage" into "codal provisions for NDT, Elasticity", "Creep & Shrinkage" (first keeps id codal-provisions-for-ndt-elasticity-creep-and-shrinkage)
- sem 3: Split topic "Modulus of elasticity" into "Modulus of elasticity", "Dynamic modulus of elasticity" (first keeps id modulus-of-elasticity)
- sem 3: Split topic "Relation between creep & Shrinkage. QA/QC of concrete" into "Relation between creep & Shrinkage", "QA/QC of concrete" (first keeps id relation-between-creep-and-shrinkage-qa-qc-of-concrete)
- sem 4: Split topic "Transformation of industrial processes through the integration of modern technologies such as sensing and actuation, communication, and computational processing" into "Transformation of industrial processes through the integration of modern technologies such as sensing and actuation, communication", "computational processing" (first keeps id transformation-of-industrial-processes-through-the)
- sem 4: Split topic "Green building certifications and standards (e.g., LEED, BREEAM, GRIHA)" into "Green building certifications and standards (e.g", "LEED", "BREEAM, GRIHA)" (first keeps id green-building-certifications-and-standards-e-g-leed-breeam)
- sem 4: Split topic "Simulation tools for sustainable building design (e.g., EnergyPlus, Designbuilder, IES VE)" into "Simulation tools for sustainable building design (e.g, EnergyPlus, Designbuilder", "IES VE)" (first keeps id simulation-tools-for-sustainable-building-design-e-g)
- sem 4: Split topic "Density, Specific Gravity, Viscosity, Compressibility, Bulk Modulus, Surface Tension, Capillarity" into "Specific Gravity, Viscosity, Compressibility", "Bulk Modulus", "Surface Tension, Capillarity" (first keeps id density-specific-gravity-viscosity-compressibility-bulk)
- sem 4: Split topic "Vertical Plane surface, Horizontal Plane Surface, Inclined Plane Surface, Curved Surface and Lock Gates" into "Vertical Plane surface", "Horizontal Plane Surface", "Inclined Plane Surface", "Curved Surface and Lock Gates" (first keeps id vertical-plane-surface-horizontal-plane-surface-inclined)
- sem 4: Split topic "Fluid Kinematics: Introduction, Types of Flow, Continuity Equation" into "Fluid Kinematics: Introduction", "Types of Flow", "Continuity Equation" (first keeps id fluid-kinematics-introduction-types-of-flow-continuity)
- sem 4: Split topic "Three Dimensions and Cylindrical Co-ordinates, Velocity and Acceleration, Velocity Potential Function and Stream Function, Vortex Flow" into "Three Dimensions and Cylindrical Co-ordinates", "Velocity and Acceleration", "Velocity Potential Function and Stream Function", "Vortex Flow" (first keeps id stream-function-potential)
- sem 4: Split topic "Fluid Dynamics: Introduction, Euler’s and Bernoulli’s Equation, Practical Application of Bernoulli’s Equation" into "Fluid Dynamics: Introduction", "Euler’s and Bernoulli’s Equation" (first keeps id euler-bernoulli-fm)
- sem 4: Split topic "Venturimeter, Orifice Meter and Pitot Tube, Momentum Equation, Free Liquid Jets" into "Orifice Meter and Pitot Tube", "Momentum Equation", "Free Liquid Jets" (first keeps id venturimeter-orifice-meter-and-pitot-tube-momentum-equation)
- sem 4: Split topic "Coefficient of Viscosity. Turbulent Flow: Introduction" into "Coefficient of Viscosity", "Turbulent Flow: Introduction" (first keeps id coefficient-of-viscosity-turbulent-flow-introduction)
- sem 4: Split topic "Introduction, Energy Loss due to Friction, Minor Energy Losses, HGL and TEL, Flow Through Syphon, Flow Through Pipes" into "Introduction, Energy Loss due to Friction", "Minor Energy Losses", "HGL and TEL", "Flow Through Syphon" (first keeps id introduction-energy-loss-due-to-friction-minor-energy-losses)
- sem 4: Split topic "Structural geology: Dip, strike, folds, faults and joints-their engineering aspects" into "Structural geology: Dip, strike, folds", "faults and joints-their engineering aspects" (first keeps id folds-faults)
- sem 4: Split topic "Field and laboratory permeability tests" into "Field and laboratory permeability tests", "Laboratory and field tests" (first keeps id darcy-permeability)
- sem 4: Split topic "Theodolite survey: Instruments, Measurement of horizontal and vertical angle" into "Theodolite survey: Instruments", "Measurement of horizontal and vertical angle" (first keeps id theodolite-angles)
- sem 4: Split topic "Principle of Electronic Distance Measurement, Modulation, Types of EDM instrument modern surveying equipment, Total Station - Parts, Accessories, Advantages and Applications, land surveying with total" into "Principle of Electronic Distance Measurement", "Modulation", "Types of EDM instrument modern surveying equipment, Parts, Accessories", "Advantages and Applications", "land surveying with total stations" (first keeps id edm-total-station)
- sem 4: Split topic "Global Positioning Systems- Segments, GPS measurements, errors and biases, Surveying with GPS, Co-ordinate transformation, accuracy considerations" into "Global Positioning Systems- Segments", "GPS measurements", "errors and biases", "Surveying with GPS", "Co-ordinate transformation", "accuracy considerations" (first keeps id global-positioning-systems-segments-gps-measurements-errors)
- sem 4: Split topic "GIS applications" into "GIS applications", "applications of GIS in Civil Engineering" (first keeps id gis-applications)
- sem 4: Split topic "Method of superposition, Plane Trusses, Deflection of Trusses" into "Method of superposition", "Plane Trusses", "Deflection of Trusses" (first keeps id method-of-superposition-plane-trusses-deflection-of-trusses)
- sem 5: Split topic "Evaporation Losses, Infiltration: Process-Capacity-Rate-Capacity Curve-Indices -Computation of Runoff- Unit hydrograph, Flood hydrograph, S-Curve Hydrograph" into "Evaporation Losses", "Infiltration: Process-Capacity-Rate-Capacity Curve-Indices -Computation of Runoff- Unit hydrograph", "Flood hydrograph", "S-Curve Hydrograph" (first keeps id evaporation-losses-infiltration-process-capacity-rate)
- sem 5: Split topic "Reservoir Planning, Definition and Types" into "Reservoir Planning", "Definition and Types" (first keeps id reservoir-planning-definition-and-types)
- sem 5: Split topic "Catchment and Reservoir Yield, Reservoir Capacity and Methods of Finding" into "Catchment and Reservoir Yield", "Reservoir Capacity and Methods of Finding" (first keeps id catchment-and-reservoir-yield-reservoir-capacity-and-methods)
- sem 5: Split topic "Reservoir Sedimentation, Reservoir Losses" into "Reservoir Sedimentation", "Reservoir Losses" (first keeps id reservoir-sedimentation-reservoir-losses)
- sem 5: Split topic "Introduction of model" into "Introduction of model", "Introduction of Hydrologic and Hydrodynamic model" (first keeps id introduction-of-model)
- sem 5: Split topic "T and L beams for under- reinforced and balanced sections, & singly and doubly reinforced" into "T and L beams for under- reinforced and balanced sections", "& singly and doubly reinforced" (first keeps id t-and-l-beams-for-under-reinforced-and-balanced-sections-and)
- sem 5: Split topic "Design of one way, two-way and cantilever slabs for flexure and check for shear deflections Design Staircase" into "Design of one way", "two-way and cantilever slabs for flexure and check for shear deflections Design Staircase" (first keeps id design-of-one-way-two-way-and-cantilever-slabs-for-flexure)
- sem 5: Split topic "Effective lengths, slenderness ratio, Short and long columns definitions" into "Effective lengths", "slenderness ratio", "Short and long columns definitions" (first keeps id effective-lengths-slenderness-ratio-short-and-long-columns)
- sem 6: Split topic "types of connections . Bolted connections: types bolts" into "types of connections", "Bolted connections: types bolts, specification" (first keeps id types-of-connections-bolted-connections-types-bolts)
- sem 6: Split topic "Beam to column connections: Connections subjected axial load and twisting moments" into "Beam to column connections: Connections subjected axial load and twisting moments", "Beam to column connections: Connections subjected axial load and bending moments" (first keeps id beam-to-column-connections-connections-subjected-axial-load)
- sem 6: Split topic "Beam to column welded connections: Connections subjected axial load and twisting moments" into "Beam to column welded connections: Connections subjected axial load and twisting moments", "Beam to column welded connections: Connections subjected axial load and bending moments" (first keeps id beam-to-column-welded-connections-connections-subjected)
- sem 6: Split topic "Design of laterally supported beams subjected to uniformly distributed loads" into "Design of laterally supported beams subjected to uniformly distributed loads", "Design of laterally un supported beams subjected to uniformly distributed loads" (first keeps id design-of-laterally-supported-beams-subjected-to-uniformly)
- sem 6: Split topic "design numerical examples" into "design numerical examples", "code provisions design numerical examples" (first keeps id design-numerical-examples)
- sem 6: Split topic "Characterization of wastewater (physical, chemical and biological)" into "Characterization of wastewater (physical", "chemical and biological)" (first keeps id characterization-of-wastewater-physical-chemical-and)
- sem 6: Split topic "Importance of geometric design- Terrain classification- Design speed- Factors affecting geometric design, Cross sectional elements-Camber- width of pavement- Sight Distance design- Stopping sight dist" into "Importance of geometric design- Terrain classification- Design speed- Factors affecting geometric design", "Cross sectional elements-Camber- width of pavement- Sight Distance design- Stopping sight distance- Overtaking sight dis" (first keeps id sight-distance)
- sem 6: Split topic "Desirable properties and different test procedure of pavement materials (tests for soil, aggregate, bitumen etc.- Road construction methods- PAVEMENT DESIGN- Pavement types- component parts of flexibl" into "Desirable properties and different test procedure of pavement materials (tests for soil, aggregate", "bitumen etc.- Road construction methods- PAVEMENT DESIGN- Pavement types- component parts of flexible and rigid pavement" (first keeps id pavement-materials)
- sem 6: Split topic "Traffic studies on flow and speed, peak hour factor, accident study, statistical analysis of traffic data" into "Traffic studies on flow and speed", "peak hour factor", "accident study", "statistical analysis of traffic data" (first keeps id traffic-studies-on-flow-and-speed-peak-hour-factor-accident)
- sem 6: Split topic "Microscopic and macroscopic parameters of traffic flow, fundamental relationships" into "Microscopic and macroscopic parameters of traffic flow", "fundamental relationships" (first keeps id microscopic-and-macroscopic-parameters-of-traffic-flow)
- sem 7: Split topic "Task Work" into "Task Work", "Cement Concrete (C.C) Work, R.C.C, Work" (first keeps id task-work)
- sem 7: Split topic "R.C.C. Work" into "Plastering Work", "Flooring Work", "Roofing Work" (first keeps id r-c-c-work)
- sem 7: Split topic "Standard Specification Writing for Construction Items – Earthwork for Foundation" into "Standard Specification Writing for Construction Items", "Earthwork for Foundation" (first keeps id standard-specification-writing-for-construction-items)
- sem 7: Split topic "Brick Work in Cement Mortar (Class I, II and III)" into "Brick Work in Cement Mortar (Class I", "II and III)" (first keeps id brick-work-in-cement-mortar-class-i-ii-and-iii)
- sem 7: Split topic "R.C.C Structures (Slab, Beam, Column-Footing, Retaining Wall)" into "R.C.C Structures (Slab, Beam", "Column-Footing", "Retaining Wall)" (first keeps id r-c-c-structures-slab-beam-column-footing-retaining-wall)
- sem 7: Split topic "Three time estimates (optimistic, most likely, pessimistic)- Beta distribution- Expected time- Variance in project duration- Case Studies Project Control: Concept- Control cycle- Basic controlling par" into "Three time estimates (optimistic", "most likely", "pessimistic)- Beta distribution- Expected time- Variance in project duration- Case Studies Project Control: ConceptContr" (first keeps id three-time-estimates-optimistic-most-likely-pessimistic-beta)
- sem 7: Split topic "duration parameters, Common Earthquake effects: Surface rupture" into "duration parameters", "Common Earthquake effects: Surface rupture" (first keeps id duration-parameters-common-earthquake-effects-surface)
- sem 7: Split topic "Free Vibrations of Single-Degree-of-Freedom Systems: Dynamic loads and dynamic analysis" into "Free Vibrations of Single-Degree-of-Freedom Systems: Dynamic loads and dynamic analysis", "Forced vibrations of single-degree-of-freedom systems: Forced vibrations (harmonic loading) of single-degree-of-freedom" (first keeps id free-vibrations-of-single-degree-of-freedom-systems-dynamic)
- sem 7: Split topic "viscously damped vibrations, equations of motion and solution" into "viscously damped vibrations", "equations of motion and solution" (first keeps id viscously-damped-vibrations-equations-of-motion-and-solution)
- sem 7: Split topic "Case Studies. Effect of Short Column" into "Case Studies", "Effect of Short Column" (first keeps id case-studies-effect-of-short-column)

</details>

<details><summary>extra item not in any handout (13)</summary>

- sem 1: Retire topic "Total derivatives" in chapter "Differential Calculus and its Applications" [course shared with ce, ece]
- sem 3: Retire topic "Solution of difference equation-complementary function- Particular integral" in chapter "Difference Equation and Z-transform"
- sem 3: Retire topic "one- dimensional heat equation" in chapter "Partial Differential Equations"
- sem 3: Retire topic "Laboratory Contents: 1. List out abbreviations and symbols used in building planning. (2 A-2 size sheet). 2. Draw a layout of different types of doors, windows, trusses and stairs used in building. (4" in chapter "Planning Public Building and Perspective Drawing"
- sem 5: Retire topic "Laboratory" in chapter "Modeling Techniques in Water Resources Engineering"
- sem 6: Retire topic "Laboratory" in chapter "Traffic Engineering"
- sem 7: Retire topic "etc" in chapter "Specification"
- sem 7: Retire topic "Introduction- Parameters affecting a project- Project planning & implementation cycle- Concept & scope of project management-Role of project manager- Enhancing the probability of success of a project " in chapter "Concept, Scope of Project Management and Phases of Project Life Cycle"
- sem 7: Retire topic "Laboratory" in chapter "Project Monitoring and Risk Management"
- sem 7: Retire chapter "Introduction to Project Management Tools" (7 topics) of pdeu-project-management-with-lab
- sem 7: Retire chapter "Project Planning and Scheduling" (6 topics) of pdeu-project-management-with-lab
- sem 7: Retire chapter "Project Tracking and Monitoring" (4 topics) of pdeu-project-management-with-lab
- sem 7: Retire chapter "Advanced Topics in Construction Management" (6 topics) of pdeu-project-management-with-lab

</details>

### ce

<details><summary>course in wrong semester (1)</summary>

- sem 1: Move pdeu-biological-systems-for-engineers for ce from sem 2 to sem 1

</details>

<details><summary>new course (5)</summary>

- sem 4: Add course "Open Source Technologies" (24CS221T, 4 units)
- sem 4: Add course "Introduction to Data Science" (24CS222T, 4 units)
- sem 6: Add course "Web Development" (24CS321T, 4 units)
- sem 7: Add course "Global Data Security and Privacy Laws" (24CS422T, 4 units)
- sem 7: Add course "Green IT" (24CS421T, 4 units)

</details>

<details><summary>new practical course (21)</summary>

- sem 1: Add lab "Applied Physics Laboratory (For CS, ICT, ECE, EE)" (13 experiments), related to Applied Physics (For CS, ICT, ECE, EE)
- sem 1: Add lab "Workshop Practice" (10 experiments)
- sem 1: Add lab "Computer Programming – I Laboratory" (9 experiments), related to Computer Programming-I
- sem 2: Add lab "Engineering Chemistry Practical" (11 experiments), related to Engineering Chemistry
- sem 2: Add lab "Elements of Electrical and Electronics Engineering Laboratory" (13 experiments), related to Elements of Electrical and Electronics Engineering
- sem 2: Add lab "Engineering Graphics - Laboratory" (9 experiments)
- sem 2: Add lab "Computer Programming-II Laboratory" (8 experiments), related to Computer Programming-II
- sem 3: Add lab "Database Management Systems Laboratory" (7 experiments), related to Database Management Systems
- sem 3: Add lab "Data Structures Laboratory" (12 experiments), related to Data Structures
- sem 3: Add lab "Object Oriented Programming Paradigms Laboratory" (11 experiments), related to Object Oriented Programming Paradigms
- sem 4: Add lab "Design Thinking Laboratory" (16 experiments)
- sem 4: Add lab "Software Engineering Laboratory" (18 experiments), related to Software Engineering
- sem 4: Add lab "Design and Analysis of Algorithms Laboratory" (15 experiments), related to Design and Analysis of Algorithms
- sem 5: Add lab "Computer Networks Laboratory" (11 experiments), related to Computer Networks
- sem 5: Add lab "Compiler Design Laboratory" (8 experiments), related to Compiler Design
- sem 5: Add lab "Operating System Laboratory" (10 experiments), related to Operating System
- sem 6: Add lab "Cryptography and Network Security Laboratory" (9 experiments), related to Cryptography and Network Security
- sem 6: Add lab "Web and Mobile Development Essentials Laboratory" (7 experiments), related to Web and Mobile Development Essentials
- sem 6: Add lab "Distributed Computing Laboratory" (0 experiments), related to Distributed Computing
- sem 7: Add lab "Industry 4.0 Laboratory" (10 experiments), related to Industry 4.0
- sem 7: Add lab "Machine Learning Laboratory" (10 experiments), related to Machine Learning

</details>

<details><summary>topic under wrong unit (20)</summary>

- sem 3: Move topic "Math class" from chapter "Introduction to Object-Oriented Programming" to "Inheritance and Polymorphism"
- sem 3: Move topic "Classes" from chapter "Introduction to Object-Oriented Programming" to "Inheritance and Polymorphism"
- sem 3: Move topic "Static Data and Function" from chapter "Introduction to Object-Oriented Programming" to "Inheritance and Polymorphism"
- sem 4: Move topic "Real-world examples and case studies illustrating the role of interrupts in process state transitions" from chapter "Pipelining and Multiprocessing Unit" to "Control Unit and Memory Architecture"
- sem 4: Move topic "Regular Expression" from chapter "Finite Automata and Regular Language" to "Computability and Complexity"
- sem 4: Move topic "NFA with epsilon transitions" from chapter "Finite Automata and Regular Language" to "Computability and Complexity"
- sem 4: Move topic "Minimization of DFA" from chapter "Finite Automata and Regular Language" to "Computability and Complexity"
- sem 4: Move topic "Equivalence of PDAs accepting by final state and by empty stack" from chapter "Pushdown Automata and Context-free Language" to "Computability and Complexity"
- sem 4: Move topic "Amortized analysis. Recurrence solving: Intelligent guesswork and proof by induction" from chapter "Introduction" to "Divide & Conquer and Greedy Algorithms"
- sem 4: Move topic "change of variable" from chapter "Introduction" to "Divide & Conquer and Greedy Algorithms"
- sem 4: Move topic "recurrence tree" from chapter "Introduction" to "Divide & Conquer and Greedy Algorithms"
- sem 4: Move topic "master theorem" from chapter "Introduction" to "Divide & Conquer and Greedy Algorithms"
- sem 4: Move topic "Matrix multiplication. Greedy: Interval scheduling" from chapter "Divide & Conquer and Greedy Algorithms" to "Dynamic Programming Backtracking, Branch & Bound"
- sem 4: Move topic "job sequencing with deadline" from chapter "Divide & Conquer and Greedy Algorithms" to "Dynamic Programming Backtracking, Branch & Bound"
- sem 4: Move topic "fractional knapsack" from chapter "Divide & Conquer and Greedy Algorithms" to "Dynamic Programming Backtracking, Branch & Bound"
- sem 4: Move topic "MST using Kruskal algorithm" from chapter "Divide & Conquer and Greedy Algorithms" to "Dynamic Programming Backtracking, Branch & Bound"
- sem 4: Move topic "Dijkstra’s algorithm" from chapter "Divide & Conquer and Greedy Algorithms" to "Dynamic Programming Backtracking, Branch & Bound"
- sem 4: Move topic "Travelling Salesman Problem. Backtracking: 0/1 Knapsack" from chapter "Dynamic Programming Backtracking, Branch & Bound" to "Intractability, Randomized and Approximation Algorithms"
- sem 4: Move topic "n-queens problem. Branch and Bound: 0/1 Knapsack" from chapter "Dynamic Programming Backtracking, Branch & Bound" to "Intractability, Randomized and Approximation Algorithms"
- sem 4: Move topic "Travelling Salesman Problem" from chapter "Dynamic Programming Backtracking, Branch & Bound" to "Intractability, Randomized and Approximation Algorithms"

</details>

<details><summary>topic missing (103)</summary>

- sem 1: Add topic "Thermal Pollution" to chapter "Multi-scale Environmental Pollution (global, Regional and Local)" [course shared with ece]
- sem 1: Add topic "Radioactive Pollution" to chapter "Multi-scale Environmental Pollution (global, Regional and Local)" [course shared with ece]
- sem 1: Add topic "HOURS" to chapter "Engineering Perspectives of Biological Sciences"
- sem 1: Add topic "understanding coexistence and sync with nature" to chapter "Harmony in Relationship – Family, Society and Nature"
- sem 2: Add topic "Operation of transformer on noload and load" to chapter "Introduction to Electrical Machines and Electrical Installation"
- sem 2: Add topic "types of 3-phase induction motors" to chapter "Introduction to Electrical Machines and Electrical Installation"
- sem 2: Add topic "production of rotating magnetic field, operation" to chapter "Introduction to Electrical Machines and Electrical Installation"
- sem 2: Add topic "starting and running torques" to chapter "Introduction to Electrical Machines and Electrical Installation"
- sem 2: Add topic "Torque-slip characteristics" to chapter "Introduction to Electrical Machines and Electrical Installation"
- sem 2: Add topic "Power Stages in an induction motor" to chapter "Introduction to Electrical Machines and Electrical Installation"
- sem 3: Add topic "Destructors and memory management through destructors" to chapter "Introduction to Object-Oriented Programming"
- sem 3: Add topic "Execution order" to chapter "Introduction to Object-Oriented Programming"
- sem 3: Add topic "Types of inheritance: single, multiple, multilevel, hierarchical" to chapter "Inheritance and Polymorphism"
- sem 3: Add topic "Hierarchies and Multiple Inheritance" to chapter "Inheritance and Polymorphism"
- sem 3: Add topic "Function Overloading and Operator Overloading" to chapter "Inheritance and Polymorphism"
- sem 3: Add topic "Friend Functions" to chapter "Inheritance and Polymorphism"
- sem 3: Add topic "‘this’ pointer" to chapter "Advanced Concepts using Java"
- sem 3: Add topic "Dynamic Memory allocation" to chapter "Advanced Concepts using Java"
- sem 3: Add topic "Standard Template Library (STL) Overview and Usage" to chapter "Advanced Concepts using Java"
- sem 3: Add topic "Performance optimization techniques" to chapter "Advanced Concepts using Java"
- sem 3: Add topic "Behavioural Patterns" to chapter "Design Patterns and Best Practices"
- sem 3: Add topic "Applying Design Patterns in C++" to chapter "Design Patterns and Best Practices"
- sem 3: Add topic "Object-Oriented Design Principles (SOLID)" to chapter "Design Patterns and Best Practices"
- sem 3: Add topic "Code Refactoring Techniques" to chapter "Design Patterns and Best Practices"
- sem 3: Add topic "Unit Testing and Test-Driven Development (TDD)" to chapter "Design Patterns and Best Practices"
- sem 4: Add topic "AI Processor" to chapter "Processor Architecture Fundamentals"
- sem 4: Add topic "ARM processor Architecture" to chapter "Processor Architecture Fundamentals"
- sem 4: Add topic "Instruction interpretation and execution" to chapter "Processor Architecture Fundamentals"
- sem 4: Add topic "ARM" to chapter "Processor Architecture Fundamentals"
- sem 4: Add topic "privileged and non-privileged instructions" to chapter "Control Unit and Memory Architecture"
- sem 4: Add topic "software interrupts and exceptions" to chapter "Control Unit and Memory Architecture"
- sem 4: Add topic "Programs and processes" to chapter "Control Unit and Memory Architecture"
- sem 4: Add topic "SCII" to chapter "Control Unit and Memory Architecture"
- sem 4: Add topic "USB" to chapter "Control Unit and Memory Architecture"
- sem 4: Add topic "Secondary Storage" to chapter "Control Unit and Memory Architecture"
- sem 4: Add topic "solid-state drive (SSD)" to chapter "Control Unit and Memory Architecture"
- sem 4: Add topic "Comparison of SSD with HDD" to chapter "Control Unit and Memory Architecture"
- sem 4: Add topic "Multiprocessor system and its characteristics" to chapter "Pipelining and Multiprocessing Unit"
- sem 4: Add topic "Advance Research Topics in Microprocessor" to chapter "Pipelining and Multiprocessing Unit"
- sem 4: Add topic "Parallel processing concepts" to chapter "Pipelining and Multiprocessing Unit"
- sem 4: Add topic "Parallelism algorithm for multiprocessor systems" to chapter "Pipelining and Multiprocessing Unit"
- sem 4: Add topic "Introduction to GPU Architecture" to chapter "Pipelining and Multiprocessing Unit"
- sem 4: Add topic "Comparison between GPU and CPU Architecture" to chapter "Pipelining and Multiprocessing Unit"
- sem 4: Add topic "Interconnection network" to chapter "Pipelining and Multiprocessing Unit"
- sem 4: Add topic "Cache in multiprocessor systems and related problems" to chapter "Pipelining and Multiprocessing Unit"
- sem 4: Add topic "Cache coherence protocols, TUTORIALS" to chapter "Pipelining and Multiprocessing Unit"
- sem 4: Add topic "The ChurchTuring Thesis" to chapter "Turing Machine and Recursive Language"
- sem 4: Add topic "Problems DFA construction" to chapter "Computability and Complexity"
- sem 4: Add topic "Problems on NFA to DFA Conversion. 4" to chapter "Computability and Complexity"
- sem 4: Add topic "Problems on Mealy and Moore machine construction, conversion. 6" to chapter "Computability and Complexity"
- sem 4: Add topic "Pumping Lemma and Problems on Grammar construction. 7" to chapter "Computability and Complexity"
- sem 4: Add topic "Problems on parsing and ambiguity removal. 8" to chapter "Computability and Complexity"
- sem 4: Add topic "Problems on PDA construction" to chapter "Computability and Complexity"
- sem 4: Add topic "Problems on NPDA construction and Pumping Lemma for CFL. 10" to chapter "Computability and Complexity"
- sem 4: Add topic "Conversion from CNF to GNF. 11" to chapter "Computability and Complexity"
- sem 4: Add topic "Problems on Deterministic and Non-Deterministic TM Construction. 12" to chapter "Computability and Complexity"
- sem 4: Add topic "Problems on Multi-tape TM and its equivalence conversion. 13" to chapter "Computability and Complexity"
- sem 4: Add topic "Problems on TM acceptability, decidabilities" to chapter "Computability and Complexity"
- sem 4: Add topic "reducibility. 14" to chapter "Computability and Complexity"
- sem 4: Add topic "Matrix multiplication, Exponentiation" to chapter "Divide & Conquer and Greedy Algorithms"
- sem 4: Add topic "Greedy: Coin change" to chapter "Dynamic Programming Backtracking, Branch & Bound"
- sem 4: Add topic "interval partitioning" to chapter "Dynamic Programming Backtracking, Branch & Bound"
- sem 4: Add topic "Huffman coding" to chapter "Dynamic Programming Backtracking, Branch & Bound"
- sem 4: Add topic "Assembly line scheduling" to chapter "Dynamic Programming Backtracking, Branch & Bound"
- sem 4: Add topic "Branch and Bound: 0/1 Knapsack" to chapter "Intractability, Randomized and Approximation Algorithms"
- sem 5: Add topic "Basic ProblemSolving Methods" to chapter "Introduction To Ai And Searching"
- sem 5: Add topic "Introduction to associations and relationships" to chapter "Introduction, Modelling Concepts and Class Modelling"
- sem 5: Add topic "Encapsulation and abstraction in modelling" to chapter "Introduction, Modelling Concepts and Class Modelling"
- sem 5: Add topic "Access control and visibility modifiers" to chapter "Introduction, Modelling Concepts and Class Modelling"
- sem 5: Add topic "Constructors and Destructors in modelling" to chapter "Introduction, Modelling Concepts and Class Modelling"
- sem 5: Add topic "Introduction to Inheritance and its significance in design" to chapter "Introduction, Modelling Concepts and Class Modelling"
- sem 5: Add topic "Navigation of class models" to chapter "Introduction, Modelling Concepts and Class Modelling"
- sem 5: Add topic "polygon clipping" to chapter "Two-dimensional Transformation and Viewing"
- sem 5: Add topic "Visible surfaces" to chapter "Three-dimensional Object Representations and Transformations"
- sem 5: Add topic "Texture mapping" to chapter "Rendering and Colour Models"
- sem 5: Add topic "Modelling techniques and fractals" to chapter "Rendering and Colour Models"
- sem 5: Add topic "Maxflowmincut theorem" to chapter "Advanced Algorithms"
- sem 5: Add topic "modes of communication" to chapter "Data Communication Overview and Physical Layer"
- sem 5: Add topic "OSI/TCIP Model, Networks, Internet, Intranet" to chapter "Data Communication Overview and Physical Layer"
- sem 5: Add topic "Telephone and Cable network" to chapter "Data Communication Overview and Physical Layer"
- sem 5: Add topic "Physical Layer, Signals, Analog, Digital" to chapter "Data Communication Overview and Physical Layer"
- sem 6: Add topic "DiffieHellman Key Exchange" to chapter "Public Key Cryptography System"
- sem 6: Add topic "Message Ordering and Group Communication- Termination Detection Algorithms and Reasoning with Knowledge" to chapter "State Machines & Message Passing"
- sem 6: Add topic "WaitFreedom Algorithm" to chapter "Consistency, Consensus & Fault Tolerance"
- sem 6: Add topic "Agreement in (messagepassing) synchronous systems with Failures" to chapter "Consistency, Consensus & Fault Tolerance"
- sem 6: Add topic "Wait-free shared memory consensus in asynchronous systems" to chapter "Consistency, Consensus & Fault Tolerance"
- sem 6: Add topic "limitations of neuro-computing" to chapter "Artificial Neural Network"
- sem 6: Add topic "Perceptron: Linear classifiers" to chapter "Artificial Neural Network"
- sem 6: Add topic "Multi-layer perceptron's for multi- dimensional functional mappings" to chapter "Multi-Layer Perceptron Network"
- sem 6: Add topic "Associated Memory Networks: Auto-association" to chapter "Multi-Layer Perceptron Network"
- sem 6: Add topic "K-means learning" to chapter "Adaptive Resonance Theory"
- sem 6: Add topic "LMS algorithm" to chapter "Adaptive Resonance Theory"
- sem 6: Add topic "comparison with Multi-Layer Perceptron networks" to chapter "Adaptive Resonance Theory"
- sem 6: Add topic "Support Vector Machines (SVM): Optimal hyperplane for linear separability" to chapter "Adaptive Resonance Theory"
- sem 6: Add topic "quadratic optimization" to chapter "Adaptive Resonance Theory"
- sem 6: Add topic "SVM for pattern recognition" to chapter "Adaptive Resonance Theory"
- sem 6: Add topic "different kernels for hidden-layer" to chapter "Adaptive Resonance Theory"
- sem 6: Add topic "optimal design of SVM" to chapter "Adaptive Resonance Theory"
- sem 7: Add topic "Forensic Tools and Techniques: Overview of. software and hardware used in digital investigations" to chapter "Digital Forensics"
- sem 7: Add topic "Case Studies in Digital Forensics: Realworld examples of digital forensic investigations and their legal implications" to chapter "Digital Forensics"
- sem 7: Add topic "Advanced Pretraining for Language Models" to chapter "Deep Learning for NLP & LLM"
- sem 7: Add topic "IoT network layer:oWPAN" to chapter "Iot PROTOCOLS"
- sem 7: Add topic "Application layer protocolsCoAP" to chapter "Iot PROTOCOLS"

</details>

<details><summary>topic split (160)</summary>

- sem 1: Split topic "Hall Effect, and magnetic materials" into "Hall Effect", "magnetic materials" (first keeps id hall-effect)
- sem 1: Split topic "Sustainable Development" into "Sustainable Development", "Sustainable Development Goals" (first keeps id sustainable-development) [course shared with ece]
- sem 1: Split topic "Its importance and Multidisciplinary nature, Introduction to Environmental Parameters and their standards (air, water, soil, noise, etc.)" into "Its importance and Multidisciplinary nature", "Introduction to Environmental Parameters and their standards (air, water, soil, noise, etc.)" (first keeps id its-importance-and-multidisciplinary-nature-introduction-to) [course shared with ece]
- sem 1: Split topic "Ecosystem and its types, Ideal ecosystem, Biodiversity : Its importance and conservation" into "Ecosystem and its types", "Ideal ecosystem", "Biodiversity : Its importance and conservation" (first keeps id ecosystem-and-its-types-ideal-ecosystem-biodiversity-its) [course shared with ece]
- sem 1: Split topic "Pollution, Causes and Effects of different types of pollution : Air Pollution, Water Pollution, Soil Pollution, Solid Waste (organic and Inorganic) Pollution, Hazardous Waste Pollution, Marine Polluti" into "Pollution, Causes and Effects of different types of pollution : Air Pollution", "Water Pollution", "Soil Pollution", "Solid Waste (organic and Inorganic) Pollution", "Hazardous Waste Pollution", "Marine Pollution" (first keeps id pollution-causes-and-effects-of-different-types-of-pollution) [course shared with ece]
- sem 1: Split topic "Introduction to man-made disasters like floods, heat waves, landslides, etc., Introduction to the various instruments for measuring air pollution, water pollution, noise, etc" into "Noise Pollution", "Introduction to man-made disasters like floods", "heat waves, landslides, etc", "Introduction to the various instruments for measuring air pollution", "water pollution, noise" (first keeps id introduction-to-man-made-disasters-like-floods-heat-waves) [course shared with ece]
- sem 1: Split topic "Cell as a basic unit of life, prokaryotic and eukaryotic cells, microbes, plant and animal cells" into "Cell as a basic unit of life", "prokaryotic and eukaryotic cells, microbes", "plant and animal cells" (first keeps id cell-as-a-basic-unit-of-life-prokaryotic-and-eukaryotic)
- sem 1: Split topic "Cell organelles – structure and function" into "Cell organelles", "structure and function" (first keeps id cell-organelles-structure-and-function)
- sem 1: Split topic "Vitamins and Minerals, Carbohydrates, Lipids, Amino Acids and proteins, Nucleic Acids (DNA and RNA)" into "Vitamins and Minerals, Carbohydrates, Lipids", "Amino Acids and proteins", "Nucleic Acids (DNA and RNA)" (first keeps id vitamins-and-minerals-carbohydrates-lipids-amino-acids-and)
- sem 1: Split topic "Brain as a CPU system (architecture, CNS and Peripheral Nervous System, signal transmission, EEG, Robotic arms for prosthetics)" into "Brain as a CPU system (architecture", "CNS and Peripheral Nervous System", "signal transmission", "EEG", "Robotic arms for prosthetics)" (first keeps id brain-as-a-cpu-system-architecture-cns-and-peripheral)
- sem 1: Split topic "The ear and nose as signal transmission models. Lungs operate as an exchange model" into "The ear and nose as signal transmission models", "Lungs operate as an exchange model" (first keeps id the-ear-and-nose-as-signal-transmission-models-lungs-operate)
- sem 1: Split topic "kidneys function as a filtration system. Echolocation (ultrasonography, sonars)" into "kidneys function as a filtration system", "Echolocation (ultrasonography, sonars)" (first keeps id kidneys-function-as-a-filtration-system-echolocation)
- sem 1: Split topic "Photosynthesis (photovoltaic cells, bionic leaf). Bird flying (GPS and aircrafts)" into "Photosynthesis (photovoltaic cells", "bionic leaf)", "Bird flying (GPS and aircrafts)" (first keeps id photosynthesis-photovoltaic-cells-bionic-leaf-bird-flying)
- sem 1: Split topic "Bio printing techniques and materials. Applications of Bioinformatics" into "Bio printing techniques and materials", "Applications of Bioinformatics" (first keeps id bio-printing-techniques-and-materials-applications-of)
- sem 1: Split topic "At cell level: Hybridoma technology, At tissue level: Plant Tissue Culture, Animal Tissue Culture" into "At cell level: Hybridoma technology", "At tissue level: Plant Tissue Culture", "Animal Tissue Culture" (first keeps id at-cell-level-hybridoma-technology-at-tissue-level-plant)
- sem 1: Split topic "Tissue Engineering, Introduction to Biomimetics and Biomimicry, Nanobiotechnology, Introduction to Radiology, High-throughput diagnostics in clinics: Molecular Diagnostics (PCR), DNA chips" into "Tissue Engineering", "Introduction to Biomimetics and Biomimicry, Nanobiotechnology", "Introduction to Radiology", "High-throughput diagnostics in clinics: Molecular Diagnostics (PCR)", "DNA chips" (first keeps id tissue-engineering-introduction-to-biomimetics-and)
- sem 1: Split topic "go to statement. Loop control structures- while" into "go to statement", "Loop control structures- while" (first keeps id go-to-statement-loop-control-structures-while)
- sem 1: Split topic "Array Manipulations. Matrix operations" into "Array Manipulations", "Matrix operations" (first keeps id array-manipulations-matrix-operations)
- sem 1: Split topic "Pointer" into "Pointer arithmetic", "Pointer to pointer" (first keeps id pointer)
- sem 1: Split topic "understanding material (physical facilities) and spiritual needs - need of mind and body" into "understanding material (physical facilities) and spiritual needs", "need of mind and body" (first keeps id understanding-material-physical-facilities-and-spiritual)
- sem 2: Split topic "instantaneous power" into "instantaneous power", "average power and reactive power" (first keeps id instantaneous-power)
- sem 2: Split topic "polyphase circuits" into "polyphase circuits", "power measurement in polyphase circuits" (first keeps id polyphase-circuits)
- sem 2: Split topic "Magnetic materials and its B-H characteristic, Faraday’s Law of Electromagnetic Induction" into "Magnetic materials and its B-H characteristic", "Faraday’s Law of Electromagnetic Induction" (first keeps id faradays-law)
- sem 2: Split topic "Components of LT Switchgear: Switch Fuse Unit (SFU), MCB, ELCB, MCCB, Types of Wires and Cables, Earthing, Types of Batteries, Important Characteristics for Batteries" into "Components of LT Switchgear: Switch Fuse Unit (SFU)", "MCB", "ELCB", "MCCB", "Types of Wires and Cables, Earthing", "Types of Batteries", "Important Characteristics for Batteries" (first keeps id lt-switchgear)
- sem 2: Split topic "Elementary calculations for energy consumption, Electrical safety rules" into "Elementary calculations for energy consumption", "Electrical safety rules" (first keeps id elementary-calculations-for-energy-consumption-electrical)
- sem 2: Split topic "Semiconductor Diodes and Applications, Diode as a Switch, Diode as a Rectifier, Half Wave and Full Wave Rectifiers with and without Filters" into "Semiconductor Diodes and Applications", "Diode as a Switch", "Diode as a Rectifier", "Half Wave and Full Wave Rectifiers with and without Filters" (first keeps id rectifiers)
- sem 2: Split topic "Breakdown Mechanisms, Zener Diode – Operation and Applications" into "Breakdown Mechanisms", "Zener Diode", "Operation and Applications" (first keeps id breakdown-mechanisms-zener-diode-operation-and-applications)
- sem 2: Split topic "Opto-Electronic Devices–LEDs, Photo Diode and Applications" into "Opto-Electronic Devices–LEDs", "Photo Diode and Applications" (first keeps id opto-electronic-devices-leds-photo-diode-and-applications)
- sem 2: Split topic "Transistor Characteristics covering, Bipolar Junction Transistor (BJT)" into "Transistor Characteristics covering", "Bipolar Junction Transistor (BJT)" (first keeps id pn-junction-physics)
- sem 2: Split topic "Construction, Operation, Amplifying Action, Common Base, Common Emitter and Common Collector Configurations, Field Effect Transistor (FET)" into "Amplifying Action", "Common Base", "Common Emitter and Common Collector Configurations", "Field Effect Transistor (FET)" (first keeps id construction-operation-amplifying-action-common-base-common)
- sem 2: Split topic "Comparison with other programming languages. Python IDEs Tokens: Identifiers" into "Comparison with other programming languages", "Python IDEs Tokens: Identifiers" (first keeps id comparison-with-other-programming-languages-python-ides)
- sem 2: Split topic "elif and else" into "elif and else, nesting", "for else and while else" (first keeps id elif-and-else)
- sem 2: Split topic "Decorator function" into "Decorator function", "Decorator chaining Generator function" (first keeps id decorator-function)
- sem 2: Split topic "Definition and scope of organization, behaviour, and organizational behaviour" into "Definition and scope of organization, behaviour", "organizational behaviour" (first keeps id definition-and-scope-of-organization-behaviour-and)
- sem 2: Split topic "power dynamics, and organizational politics" into "power dynamics", "organizational politics" (first keeps id power-dynamics-and-organizational-politics)
- sem 3: Split topic "Logic and Propositional calculus – Simple and Compound Propositions" into "Logic and Propositional calculus", "Simple and Compound Propositions" (first keeps id logic-and-propositional-calculus-simple-and-compound)
- sem 3: Split topic "Pigeonhole principle" into "Permutation, Combination, Pigeonhole principle", "Extended Pigeonhole principle" (first keeps id pigeonhole)
- sem 3: Split topic "Paths and Connectivity. Traversable and Eulerian graphs, and Konigsberg Bridge problem" into "Paths and Connectivity", "Traversable and Eulerian graphs", "Konigsberg Bridge problem" (first keeps id paths-and-connectivity-traversable-and-eulerian-graphs-and)
- sem 3: Split topic "Graph coloring. Four color problem. Directed graphs" into "Graph coloring", "Four color problem" (first keeps id graph-coloring-four-color-problem-directed-graphs)
- sem 3: Split topic "sequential representation of directed graphs" into "Directed graphs", "sequential representation of directed graphs" (first keeps id sequential-representation-of-directed-graphs)
- sem 3: Split topic "Adjacency matrix" into "Adjacency matrix", "Powers of the adjacency matrix" (first keeps id adjacency-matrix)
- sem 3: Split topic "Group" into "Group, Semi group, Monoids", "Properties of a Group", "Order of a group" (first keeps id group)
- sem 3: Split topic "Database Users. Entity-Relationship Model" into "Database Users", "Entity-Relationship Model" (first keeps id er-model)
- sem 3: Split topic "sub queries" into "sub queries", "correlated sub-queries" (first keeps id sub-queries)
- sem 3: Split topic "dependency theory - functional dependencies" into "dependency theory", "functional dependencies" (first keeps id dependency-theory-functional-dependencies)
- sem 3: Split topic "3NF and BCNF. File Organization: Sequential" into "3NF and BCNF", "File Organization: Sequential" (first keeps id 3nf-and-bcnf-file-organization-sequential)
- sem 3: Split topic "ACID properties, Schedules, Serializability, Concurrency control protocols, measures of query cost, selection operation, sorting, join" into "ACID properties, Schedules, Serializability", "Concurrency control protocols", "measures of query cost", "selection operation", "sorting, join" (first keeps id serializability)
- sem 3: Split topic "Data Encryption. Introduction to NOSQL Databases" into "Data Encryption", "Introduction to NOSQL Databases" (first keeps id data-encryption-introduction-to-nosql-databases)
- sem 3: Split topic "design and implementation of digital systems. Truth table" into "design and implementation of digital systems", "Truth table" (first keeps id design-and-implementation-of-digital-systems-truth-table)
- sem 3: Split topic "Basic logic operation and logic gates. Number Systems and Codes: Positional number system" into "Basic logic operation and logic gates", "Number Systems and Codes: Positional number system, Binary" (first keeps id basic-logic-operation-and-logic-gates-number-systems-and)
- sem 3: Split topic "Error detection and correction codes - parity check codes and Hamming codes" into "Error detection and correction codes", "parity check codes and Hamming codes" (first keeps id error-detection-and-correction-codes-parity-check-codes-and)
- sem 3: Split topic "D flip-flop" into "D flip-flop", "JK flip-flop", "T flip-flop" (first keeps id d-flip-flop)
- sem 3: Split topic "Design of state machines - state table" into "Design of state machines", "state table" (first keeps id design-of-state-machines-state-table)
- sem 3: Split topic "CMOS. Programmable Logic Devices: PLAs and their applications" into "CMOS", "Programmable Logic Devices: PLAs and their applications" (first keeps id cmos-programmable-logic-devices-plas-and-their-applications)
- sem 3: Split topic "Asymptotic Notations, Searching and sorting in arrays" into "Asymptotic Notations", "Searching and sorting in arrays" (first keeps id asymptotic-notations-searching-and-sorting-in-arrays)
- sem 3: Split topic "Stack: Definition and concepts, Push and Pop operations" into "Stack: Definition and concepts", "Push and Pop operations" (first keeps id stack-definition-and-concepts-push-and-pop-operations)
- sem 3: Split topic "Applications: Infix to prefix and postfix, evaluate postfix, recursion" into "Applications: Infix to prefix and postfix", "evaluate postfix", "recursion" (first keeps id applications-infix-to-prefix-and-postfix-evaluate-postfix)
- sem 3: Split topic "Queue: Definition and concept, Enqueue and Dequeue operations" into "Queue: Definition and concept", "Enqueue and Dequeue operations" (first keeps id queue-definition-and-concept-enqueue-and-dequeue-operations)
- sem 3: Split topic "Linked list: Definition and concept, Insert and delete operations, Representation in memory, implementing stack and queue using LL, Types: Singly, Doubly, Circular" into "Linked list: Definition and concept", "Insert and delete operations", "implementing stack and queue using LL", "Types: Singly, Doubly, Circular" (first keeps id doubly-circular-lists)
- sem 3: Split topic "Types of trees: Binary, complete binary, full, perfect" into "Types of trees: Binary", "complete binary, full, perfect" (first keeps id types-of-trees-binary-complete-binary-full-perfect)
- sem 3: Split topic "Traversal: pre-order, in-order, post-order" into "Traversal: pre-order, in-order", "post-order" (first keeps id binary-tree-traversal)
- sem 3: Split topic "Types of graphs: complete, connected, directed/ undirected, weighted/ unweighted, cyclic/ non-cyclic" into "Types of graphs: complete, connected", "directed/ undirected", "weighted/ unweighted", "cyclic/ non-cyclic" (first keeps id types-of-graphs-complete-connected-directed-undirected)
- sem 3: Split topic "The symbol table, Hashing Functions: Division, Multiplication, Mid Square and Folding" into "The symbol table", "Hashing Functions: Division, Multiplication", "Mid Square and Folding" (first keeps id symbol-table)
- sem 3: Split topic "Collision Resolution Techniques: Separate Chaining, Linear Probing, Quadratic Probing and Double Hashing" into "Collision Resolution Techniques: Separate Chaining", "Linear Probing", "Quadratic Probing and Double Hashing" (first keeps id collision-resolution-techniques-separate-chaining-linear)
- sem 4: Split topic "chi-squared tests, and ANOVA" into "chi-squared tests", "ANOVA" (first keeps id chi-squared-tests-and-anova)
- sem 4: Split topic "Correlation" into "Correlation", "Simple Correlation", "Partial Correlation" (first keeps id correlation)
- sem 4: Split topic "Address bus" into "Address bus", "Data bus and control bus" (first keeps id address-bus)
- sem 4: Split topic "Register configuration of Signed Magnitude Addition-Subtraction Algorithm" into "Register configuration of Signed Magnitude Addition-Subtraction Algorithm", "Register configuration of 2’s complement Addition Subtraction Algorithm" (first keeps id register-configuration-of-signed-magnitude-addition)
- sem 4: Split topic "CPU control unit design: Hardwired and micro-programmed design approaches, design of a simple hypothetical CPU. CPU" into "CPU control unit design: Hardwired and micro-programmed design approaches", "design of a simple hypothetical CPU", "CPU" (first keeps id hardwired-control)
- sem 4: Split topic "Memory interconnections, Organization of memory modules, Associative memory, Cache Memory, Memory Mapping Techniques" into "Memory interconnections", "Organization of memory modules", "Associative memory", "Cache Memory", "Memory Mapping Techniques" (first keeps id memory-interconnections-organization-of-memory-modules)
- sem 4: Split topic "Peripheral devices and their characteristics: Input-output subsystems, I/O device interface, I/O transfers" into "Peripheral devices and their characteristics: Input-output subsystems", "I/O device interface, I/O transfers", "I/O device interfaces" (first keeps id peripheral-devices-and-their-characteristics-input-output)
- sem 4: Split topic "program controlled, interrupt driven and DMA" into "program controlled", "interrupt driven and DMA" (first keeps id interrupts-dma-mp)
- sem 4: Split topic "Pipelining, pipeline hazards, Design issues of pipeline architecture, Instruction level parallelism and advanced issues, RISC and CISC paradigm, Design issues of a RISC processor, Multiprocessor syste" into "Pipelining", "pipeline hazards", "Design issues of pipeline architecture", "Instruction level parallelism and advanced issues", "RISC and CISC paradigm", "Design issues of a RISC processor" (first keeps id risc)
- sem 4: Split topic "Architecture Styles. System modelling and UML diagrams" into "Architecture Styles", "System modelling and UML diagrams" (first keeps id architecture-styles-system-modelling-and-uml-diagrams)
- sem 4: Split topic "RMMM" into "RMMM", "RMMM Plan" (first keeps id rmmm)
- sem 4: Split topic "Regular Expression" into "Regular Expression", "Conversion of DFA to Regular Expression" (first keeps id regular-expressions)
- sem 4: Split topic "SAT" into "SAT", "Problems on SAT" (first keeps id sat)
- sem 4: Split topic "Polynomial time Reducibility" into "Polynomial time Reducibility", "Polynomial time reducibility" (first keeps id polynomial-time-reducibility)
- sem 4: Split topic "The time hierarchy theorem" into "The time hierarchy theorem", "time hierarchy theorem" (first keeps id the-time-hierarchy-theorem)
- sem 4: Split topic "NP-complete problems" into "NP-complete problems", "NP-complete problems via reductions" (first keeps id np-complete-problems)
- sem 4: Split topic "Elementary Operation Analysis Techniques. Analyzing control structures" into "Elementary Operation Analysis Techniques", "Analyzing control structures" (first keeps id elementary-operation-analysis-techniques-analyzing-control)
- sem 4: Split topic "Intractability: Brief Overview of NP theory, Some NPC problems: Independent set, vertex cover, clique, Hamiltonian cycle" into "Intractability: Brief Overview of NP theory", "Some NPC problems: Independent set", "vertex cover, clique", "Hamiltonian cycle" (first keeps id intractability-brief-overview-of-np-theory-some-npc-problems)
- sem 5: Split topic "Uniformed Search Strategies" into "Search strategies", "Uniformed Search Strategies" (first keeps id uniformed-search-strategies)
- sem 5: Split topic "Media Access Control (ALOHA, CSMA/CD)" into "Media Access Control (ALOHA", "CSMA/CD)" (first keeps id media-access-control-aloha-csma-cd)
- sem 5: Split topic "Traffic engineering and Quality of Service" into "Traffic engineering and", "Quality of Service" (first keeps id traffic-engineering-and-quality-of-service)
- sem 5: Split topic "Syntax Directed Definition" into "Syntax Directed Definition", "Syntax directed definition and translation schemes" (first keeps id syntax-directed-translation)
- sem 5: Split topic "Deadlock Detection, and Recovery from Deadlock: Resource allocation graph and wait-for-graph" into "Deadlock Detection", "Recovery from Deadlock: Resource allocation graph and wait-for-graph" (first keeps id deadlock-detection-and-recovery-from-deadlock-resource)
- sem 5: Split topic "Demand Paging" into "Paging", "Demand Paging" (first keeps id demand-paging)
- sem 5: Split topic "Page Replacement" into "Page Replacement", "Page Replacement Algorithms" (first keeps id page-replacement)
- sem 5: Split topic "Data Warehouse Definition" into "Data Warehouse Definition", "Data Warehouse v/s Data Mining" (first keeps id data-warehouse-definition)
- sem 5: Split topic "Algorithms for mining of spatial data" into "Algorithms for mining of spatial data", "Spatial Mining" (first keeps id algorithms-for-mining-of-spatial-data)
- sem 5: Split topic "Overview of Object-Oriented Modelling and Design (OOMD) principles, Contrasting OOMD with traditional modelling approaches, Understanding the core concepts of OOMD, Modelling Fundamentals: Object and " into "Overview of Object-Oriented Modelling and Design (OOMD) principles", "Contrasting OOMD with traditional modelling approaches", "Understanding the core concepts of OOMD" (first keeps id overview-of-object-oriented-modelling-and-design-oomd)
- sem 5: Split topic "Advanced Class Modelling, Advanced object and class concepts" into "Modelling Fundamentals: Object and Class Concept in modelling", "Advanced Class Modelling", "Advanced object and class concepts" (first keeps id advanced-class-modelling-advanced-object-and-class-concepts)
- sem 5: Split topic "Crafting a Problem Statement. Domain Analysis: Comprehensive Analysis Overview" into "Crafting a Problem Statement", "Domain Analysis: Comprehensive Analysis Overview" (first keeps id crafting-a-problem-statement-domain-analysis-comprehensive)
- sem 5: Split topic "Colour models (RGB, YIQ, CMY)" into "Colour models (RGB", "YIQ, CMY)" (first keeps id colour-models-rgb-yiq-cmy)
- sem 5: Split topic "2-3 Trees" into "Splay Trees", "Quad trees, k-D Trees" (first keeps id 2-3-trees)
- sem 5: Split topic "Digital, Transmission impairment, Data Rate Limits, Noiseless and Noisy channel, Performance" into "Transmission impairment", "Data Rate Limits", "Noiseless and Noisy channel, Performance" (first keeps id digital-transmission-impairment-data-rate-limits-noiseless)
- sem 5: Split topic "Analog to Analog conversion: Amplitude Modulation, Frequency Modulation, and Phase Modulation, Digital to Analog conversion: ASK, FSK, PSK, and QAM. Digital Transmission" into "Analog to Analog conversion: Amplitude Modulation", "Frequency Modulation", "Phase Modulation", "Digital to Analog conversion: ASK", "FSK", "PSK", "QAM", "Digital Transmission" (first keeps id psk-fsk-qam)
- sem 5: Split topic "Analog to digital conversion, Digitization, PCM, Transmission Modes, Line Coding (Unipolar, Polar, Biphase), Block Coding (4B/5B Encoding), DTE-DCE Interface, Modems, 56K Modems, Cable Modems" into "Analog to digital conversion, Digitization", "PCM", "Transmission Modes", "Line Coding (Unipolar, Polar, Biphase)", "Block Coding (4B/5B Encoding)", "DTE-DCE Interface, Modems", "56K Modems", "Cable Modems" (first keeps id analog-to-digital-conversion-digitization-pcm-transmission)
- sem 5: Split topic "Transmission Media – Guided Media: Twisted Pair cable" into "Transmission Media", "Guided Media: Twisted Pair cable" (first keeps id transmission-media)
- sem 5: Split topic "Coaxial cable, and Fiber optic cable" into "Coaxial cable", "Fiber optic cable" (first keeps id coaxial-cable-and-fiber-optic-cable)
- sem 5: Split topic "Unguided Media: Radio Waves, Microwaves, and Infrared satellite" into "Unguided Media: Radio Waves, Microwaves", "Infrared satellite" (first keeps id unguided-media-radio-waves-microwaves-and-infrared-satellite)
- sem 5: Split topic "FDM, WDM, Synchronous TDM (time slots & frames, interleaving, data rate management), Statistical Time Division Multiplexing, Spread Spectrum" into "FDM", "WDM", "Synchronous TDM (time slots & frames, interleaving", "data rate management)", "Spread Spectrum" (first keeps id tdm-comm)
- sem 5: Split topic "FHSS, DSSS, Switching: Circuit-Switched Networks, Datagram networks, Concept of Virtual circuit networks, structure of circuit and packet switch" into "FHSS", "DSSS", "Switching: Circuit-Switched Networks", "Datagram networks", "Concept of Virtual circuit networks", "structure of circuit and packet switch" (first keeps id switching)
- sem 6: Split topic "Euler’s Totient Function, Fermat and Euler’s theorem, Chinese Reminder Theorem, Euclidean and Extended Euclidean algorithm, RSA, Diffie- Hellman Key Exchange, MITM attack" into "Euler’s Totient Function", "Fermat and Euler’s theorem", "Chinese Reminder Theorem", "Euclidean and Extended Euclidean algorithm", "RSA", "MITM attack" (first keeps id eulers-totient-function-fermat-and-eulers-theorem-chinese)
- sem 6: Split topic "Web site planning and design issues. HTML5: structure of html document" into "Web site planning and design issues", "HTML5: structure of html document" (first keeps id web-site-planning-and-design-issues-html5-structure-of-html)
- sem 6: Split topic "Distributed Computation. Logical Clocks-Scalar Time" into "Distributed Computation", "Logical Clocks-Scalar Time" (first keeps id distributed-computation-logical-clocks-scalar-time)
- sem 6: Split topic "Global State and Snapshot Recording Algorithms, Detecting Global Predicate- Modalities on predicates, Centralized algorithm for relational predicates, Conjunctive predicates, Distributed algorithms fo" into "Global State and Snapshot Recording Algorithms", "Detecting Global Predicate- Modalities on predicates", "Centralized algorithm for relational predicates", "Conjunctive predicates", "Distributed algorithms for conjunctive predicates" (first keeps id global-state-and-snapshot-recording-algorithms-detecting)
- sem 6: Split topic "Distributed Mutual Exclusion Algorithms- Lamport’s algorithm, Ricart–Agrawala algorithm, Hr and Deadlock Detection Algorithms, Distributed Deadlock Detection Algorithm, Distributed s" into "Distributed Mutual Exclusion Algorithms- Lamport’s algorithm", "Ricart–Agrawala algorithm", "Hr and Deadlock Detection Algorithms", "Distributed Deadlock Detection Algorithm, Distributeds" (first keeps id distributed-mutual-exclusion-algorithms-lamports-algorithm)
- sem 6: Split topic "Byzantine Fault Tolerance, Checkpointing and Rollback Recovery- Checkpoint-based recovery and Log-based rollback recovery" into "Byzantine Fault Tolerance", "Checkpointing and Rollback RecoveryCheckpoint-based recovery and Log-based rollback recovery" (first keeps id byzantine-fault-tolerance-checkpointing-and-rollback)
- sem 6: Split topic "Consensus and Agreement- : Agreement in a failure-free system (synchronous or asynchronous) , Agreement in (message- passing) synchronous systems with Failures, Agreement in asynchronous message-passi" into "Consensus and Agreement- : Agreement in a failure-free system (synchronous or asynchronous)", "Agreement in asynchronous message-passing systems with failures" (first keeps id consensus-and-agreement-agreement-in-a-failure-free-system)
- sem 6: Split topic "Selected case studies- PNUTS, PAXOS, SPARK, Cryptocurrencies" into "Selected case studies- PNUTS", "PAXOS", "SPARK, Cryptocurrencies" (first keeps id selected-case-studies-pnuts-paxos-spark-cryptocurrencies)
- sem 6: Split topic "Advanced Topics: ML in Distributed Systems-Tensorflow, Parameter Server Max" into "Advanced Topics: ML in Distributed Systems-Tensorflow", "Parameter Server Max" (first keeps id advanced-topics-ml-in-distributed-systems-tensorflow)
- sem 6: Split topic "Introduction: Feed-forward, recurrent and multi-layer architectures, Supervised and unsupervised learning, Characteristics: Adaptability, fault tolerance, generalization, limitations of neuro-computin" into "Introduction: Feed-forward", "recurrent and multi-layer architectures", "Supervised and unsupervised learning", "Characteristics: Adaptability", "fault tolerance, generalization" (first keeps id perceptron)
- sem 6: Split topic "Multi-Layer Perceptron, Gradient decent scheme for error, minimization, Generalized delta learning rule, Back-propagation learning for multi-layer networks, Multi-layer perceptron's for multi- dimensi" into "Multi-Layer Perceptron", "Gradient decent scheme for error, minimization", "Generalized delta learning rule", "Back-propagation learning for multi-layer networks" (first keeps id multi-layer-perceptron-gradient-decent-scheme-for-error)
- sem 6: Split topic "Hetero-association, Linear associative networks: Hebbian learning, perfect recall, cross-talk" into "Hetero-association", "Linear associative networks: Hebbian learning", "perfect recall", "cross-talk" (first keeps id hetero-association-linear-associative-networks-hebbian)
- sem 6: Split topic "Bidirectional associative memory, Brain-State-in-a-Box network, Hopfield Networks: Binary Hopfield network, basic structure, asynchronous updating, convergence, associative memory, Continuous-valued H" into "Bidirectional associative memory", "Brain-State-in-a-Box network", "Hopfield Networks: Binary Hopfield network", "basic structure", "asynchronous updating, convergence", "associative memory", "Continuous-valued Hopfield network" (first keeps id bidirectional-associative-memory-brain-state-in-a-box)
- sem 6: Split topic "Advantages and limitations, Kohonen Networks: Self-organizing networks, Similarity measures" into "Advantages and limitations", "Kohonen Networks: Self-organizing networks", "Similarity measures" (first keeps id advantages-and-limitations-kohonen-networks-self-organizing)
- sem 6: Split topic "Kohonen’s winner-take-all network, Geometrical interpretation of Kohonen’s learning, Functional specificity of human brain, Kohonen’s self-organizing feature map algorithm" into "Kohonen’s winner-take-all network", "Geometrical interpretation of Kohonen’s learning", "Functional specificity of human brain", "Kohonen’s self-organizing feature map algorithm" (first keeps id kohonens-winner-take-all-network-geometrical-interpretation)
- sem 6: Split topic "ART-1 architecture and algorithm, search, comparison and recognition phases, effect of vigilance, Radial Basis Function Networks: radial basis vs. linear basis, Gaussian basis functions, K-means learn" into "ART-1 architecture and algorithm, search", "comparison and recognition phases", "effect of vigilance", "Radial Basis Function Networks: radial basis vs. linear basis", "Gaussian basis functions" (first keeps id svm)
- sem 6: Split topic "Learning various user research techniques including interviews, surveys, and usability testing" into "Learning various user research techniques including interviews, surveys", "usability testing" (first keeps id learning-various-user-research-techniques-including)
- sem 6: Split topic "Understanding color theory, typography, and layout in interface design" into "Understanding color theory, typography", "layout in interface design" (first keeps id understanding-color-theory-typography-and-layout-in)
- sem 6: Split topic "Integer overflow and buffer overread and heap overflow, More on heap overflow" into "Integer overflow and buffer overread and heap overflow", "More on heap overflow" (first keeps id integer-overflow-and-buffer-overread-and-heap-overflow-more)
- sem 6: Split topic "Basic segmentation algorithms: region based" into "Basic segmentation algorithms: region based, watershed", "Performance comparison between thresholding and region-based segmentation algorithms" (first keeps id basic-segmentation-algorithms-region-based)
- sem 6: Split topic "Basic Data Structure concepts related to blockchain. Introduction to Blockchain" into "Basic Data Structure concepts related to blockchain", "Introduction to Blockchain" (first keeps id basic-data-structure-concepts-related-to-blockchain)
- sem 6: Split topic "Types of Blockchain. Introduction to Crypto Currency" into "Types of Blockchain", "Introduction to Crypto Currency" (first keeps id types-of-blockchain-introduction-to-crypto-currency)
- sem 6: Split topic "Blockchains with smart contracts - Ethereum platform and its smart contract mechanism" into "Blockchains with smart contracts", "Ethereum platform and its smart contract mechanism" (first keeps id blockchains-with-smart-contracts-ethereum-platform-and-its)
- sem 6: Split topic "Avro and File-Based Data structures. Introduction to Scala programming and platforms" into "Avro and File-Based Data structures", "Introduction to Scala programming and platforms" (first keeps id avro-and-file-based-data-structures-introduction-to-scala)
- sem 6: Split topic "Network Architecture" into "Network Architecture", "UMTS- Network Protocol Architecture" (first keeps id network-architecture)
- sem 6: Split topic "Contention-based protocols" into "Contention-based protocols", "Contention-based. protocols with reservation mechanisms", "Contention-based MAC protocols with scheduling mechanisms" (first keeps id contention-based-protocols)
- sem 6: Split topic "TCP over Ad Hoc wireless networks" into "TCP over Ad Hoc wireless networks", "Ad Hoc wireless networks" (first keeps id tcp-over-ad-hoc-wireless-networks)
- sem 7: Split topic "Transformation of industrial processes through the integration of modern technologies such as sensing and actuation, communication, and computational processing" into "Transformation of industrial processes through the integration of modern technologies such as sensing and actuation, communication", "computational processing" (first keeps id transformation-of-industrial-processes-through-the)
- sem 7: Split topic "Legal Frameworks: International, national, and regional laws governing cyberspace" into "Legal Frameworks: International, national", "regional laws governing cyberspace" (first keeps id legal-frameworks-international-national-and-regional-laws)
- sem 7: Split topic "Ethical Dimensions: Understanding ethical theories and their application in the digital realm" into "Ethical Dimensions", "Understanding ethical theories and their application in the digital realm" (first keeps id ethical-dimensions-understanding-ethical-theories-and-their)
- sem 7: Split topic "Intellectual Property Rights: Copyright, trademark, and patent laws in the digital age" into "Intellectual Property Rights: Copyright, trademark", "patent laws in the digital age" (first keeps id intellectual-property-rights-copyright-trademark-and-patent)
- sem 7: Split topic "Cybercrimes and Prosecution: Legal responses to hacking, cyberterrorism, and online fraud" into "Cybercrimes and Prosecution: Legal. responses to hacking, cyberterrorism", "online fraud" (first keeps id cybercrimes-and-prosecution-legal-responses-to-hacking)
- sem 7: Split topic "Cybersecurity Ethics: Balancing security measures with individual privacy rights" into "Cybersecurity Ethics", "Balancing security measures with individual privacy rights" (first keeps id cybersecurity-ethics-balancing-security-measures-with)
- sem 7: Split topic "algorithmic biases, and the ethics of autonomous systems" into "algorithmic biases", "the ethics of autonomous systems" (first keeps id algorithmic-biases-and-the-ethics-of-autonomous-systems)
- sem 7: Split topic "Overview of reinforcement learning (RL) concepts, terminology, and applications. History and evolution of RL" into "Overview of reinforcement learning (RL) concepts, terminology, applications", "History and evolution of RL" (first keeps id reinforcement-learning)
- sem 7: Split topic "Exploration vs. exploitation trade-off and its importance in RL. Key algorithms: Multi-Armed Bandits" into "Exploration vs. exploitation trade-off and its importance in RL", "Key algorithms: Multi-Armed Bandits" (first keeps id exploration-vs-exploitation-trade-off-and-its-importance-in)
- sem 7: Split topic "Markov Decision Processes (MDPs), and Dynamic Programming" into "Markov Decision Processes (MDPs)", "Dynamic Programming" (first keeps id markov-decision-processes-mdps-and-dynamic-programming)
- sem 7: Split topic "focusing on learning a policy directly. Policy Gradient methods: REINFORCE" into "focusing on learning a policy directly", "Policy Gradient methods: REINFORCE" (first keeps id focusing-on-learning-a-policy-directly-policy-gradient)
- sem 7: Split topic "Trust Region Policy Optimization (TRPO) and its successor" into "Trust Region Policy Optimization (TRPO) and its successor", "Trust Region Policy Optimization (TRPO)" (first keeps id trust-region-policy-optimization-trpo-and-its-successor)
- sem 7: Split topic "multi-agent RL. Emerging trends and future directions in RL research and applications" into "multi-agent RL", "Emerging trends and future directions in RL research and applications" (first keeps id multi-agent-rl-emerging-trends-and-future-directions-in-rl)
- sem 7: Split topic "Intrusion Detection" into "Intrusion Detection", "Host Intrusion Detection", "Network Intrusion Detection", "Web Application Intrusion Detection" (first keeps id intrusion-detection)
- sem 7: Split topic "Software processes, Process Models" into "Software processes", "Process Models" (first keeps id software-processes-process-models)
- sem 7: Split topic "DevOps Lifecycle" into "DevOps Lifecycle", "Overview of the DevOps lifecycle stages" (first keeps id devops-lifecycle)
- sem 7: Split topic "Infrastructure provisioning tools (e.g., Terraform, Cloud Formation)" into "Infrastructure provisioning tools (e.g, Terraform", "Cloud Formation)" (first keeps id infrastructure-provisioning-tools-e-g-terraform-cloud)
- sem 7: Split topic "staging area, and remote repositories" into "staging area", "remote repositories" (first keeps id staging-area-and-remote-repositories)
- sem 7: Split topic "Different system, recognise project security threats" into "Different system", "recognise project security threats" (first keeps id different-system-recognise-project-security-threats)
- sem 7: Split topic "Network security, system software security, client-side application security, and server-side application security are the main areas of attention for security testing" into "Network security", "system software security", "client-side application security", "server-side application security are the main areas of attention for security testing" (first keeps id network-security-system-software-security-client-side)
- sem 7: Split topic "risk classification (low, medium, and high), and risk-reduction strategies. To evaluate and enhance a product's, process', or project's security" into "risk classification (low, medium, high)", "risk-reduction strategies", "To evaluate and enhance a product's, process'", "project's security" (first keeps id risk-classification-low-medium-and-high-and-risk-reduction)
- sem 7: Split topic "Overview of mobile platforms (iOS, Android) and their security models" into "Overview of mobile platforms (iOS", "Android) and their security models" (first keeps id overview-of-mobile-platforms-ios-android-and-their-security)
- sem 7: Split topic "Language Modelling" into "Language Modelling", "Advanced smoothing for language modelling" (first keeps id language-modelling)
- sem 7: Split topic "Grid computing. Cloud Service Models" into "Grid computing", "Cloud Service Models" (first keeps id grid-computing-cloud-service-models)
- sem 7: Split topic "Virtualization concepts - Types of Virtualization" into "Virtualization concepts", "Types of Virtualization" (first keeps id virtualization-concepts-types-of-virtualization)
- sem 7: Split topic "Virtualization Technology examples. Distributed Management of Virtual Infrastructures" into "Virtualization Technology examples", "Distributed Management of Virtual Infrastructures, Scheduling" (first keeps id virtualization-technology-examples-distributed-management-of)
- sem 7: Split topic "Google App Engine, and Microsoft Azure" into "Google App Engine", "Microsoft Azure" (first keeps id google-app-engine-and-microsoft-azure)
- sem 7: Split topic "Cloud Application Programming, and the Aneka Platform" into "Cloud Application Programming", "the Aneka Platform" (first keeps id cloud-application-programming-and-the-aneka-platform)
- sem 7: Split topic "superconducting circuits, and nuclear magnetic resonance" into "superconducting circuits", "nuclear magnetic resonance" (first keeps id superconducting-circuits-and-nuclear-magnetic-resonance)

</details>

<details><summary>extra item not in any handout (45)</summary>

- sem 1: Retire topic "understanding co- existence and sync with nature" in chapter "Harmony in Relationship – Family, Society and Nature"
- sem 2: Retire topic "Max" in chapter "File and Exception Handling"
- sem 3: Retire topic "Tutorial 1: Case Studies to design different circuits from basic gates (3 hrs)" in chapter "Programmable Logic Devices"
- sem 3: Retire topic "Tutorial 2: Solve problems using K-map for simplification of boolean expression (5 hrs)" in chapter "Programmable Logic Devices"
- sem 3: Retire topic "Java Programming Constructs" in chapter "Introduction to Object-Oriented Programming"
- sem 3: Retire topic "Arrays in java" in chapter "Introduction to Object-Oriented Programming"
- sem 3: Retire topic "Introduction to Java IO streams" in chapter "Advanced Concepts using Java"
- sem 3: Retire topic "Character and Binary streams" in chapter "Advanced Concepts using Java"
- sem 3: Retire topic "reading data from and writing data to files" in chapter "Advanced Concepts using Java"
- sem 3: Retire topic "Difference between error and exception" in chapter "Advanced Concepts using Java"
- sem 3: Retire topic "Multithreading in Java" in chapter "Advanced Concepts using Java"
- sem 3: Retire topic "Thread life cycle and methods" in chapter "Advanced Concepts using Java"
- sem 3: Retire topic "Runnable interface" in chapter "Advanced Concepts using Java"
- sem 3: Retire topic "Thread synchronization" in chapter "Advanced Concepts using Java"
- sem 3: Retire topic "Abstract Factory" in chapter "Design Patterns and Best Practices"
- sem 3: Retire topic "Builder" in chapter "Design Patterns and Best Practices"
- sem 3: Retire topic "Structural Design Pattern: Adapter" in chapter "Design Patterns and Best Practices"
- sem 3: Retire topic "Composite" in chapter "Design Patterns and Best Practices"
- sem 3: Retire topic "Façade Design Pattern" in chapter "Design Patterns and Best Practices"
- sem 3: Retire topic "Behavioral Patterns :Observer" in chapter "Design Patterns and Best Practices"
- sem 3: Retire topic "State" in chapter "Design Patterns and Best Practices"
- sem 3: Retire topic "Iterator" in chapter "Design Patterns and Best Practices"
- sem 4: Retire topic "Tutorial 1: Case Studies to differentiate between 32-bit and 64-bit processors (3 hrs)" in chapter "Pipelining and Multiprocessing Unit"
- sem 4: Retire topic "Case studies and examples showcasing real-world applications of microcontrollers" in chapter "Pipelining and Multiprocessing Unit"
- sem 4: Retire topic "Tutorial 2: Real-world examples and applications of different addressing modes in assembly (3 hrs)" in chapter "Pipelining and Multiprocessing Unit"
- sem 4: Retire topic "language programming" in chapter "Pipelining and Multiprocessing Unit"
- sem 4: Retire topic "Numerical problem solving on different addressing modes" in chapter "Pipelining and Multiprocessing Unit"
- sem 4: Retire topic "Tutorial 3: Comparative analysis of hardwired and micro-programmed design approaches in (4 hrs)" in chapter "Pipelining and Multiprocessing Unit"
- sem 4: Retire topic "terms of complexity, flexibility, and performance" in chapter "Pipelining and Multiprocessing Unit"
- sem 4: Retire topic "Problem solving on Memory organization" in chapter "Pipelining and Multiprocessing Unit"
- sem 4: Retire topic "Case studies and examples illustrating the differences between RISC and CISC instruction sets" in chapter "Pipelining and Multiprocessing Unit"
- sem 4: Retire topic "Exercises on parallel algorithms on multiprocessor systems" in chapter "Pipelining and Multiprocessing Unit"
- sem 5: Retire topic "Introduction to AR-VR" in chapter "Basic of Computer Graphics and Primitive Drawing Algorithms"
- sem 5: Retire topic "Unity essentials" in chapter "Two-dimensional Transformation and Viewing"
- sem 5: Retire topic "Concepts Related to Augmented Reality" in chapter "Three-dimensional Object Representations and Transformations"
- sem 5: Retire topic "Concepts Related to Virtual Reality" in chapter "Rendering and Colour Models"
- sem 5: Retire topic "Maxflow- mincut theorem" in chapter "Advanced Algorithms"
- sem 6: Retire topic "Communication- Message-passing systems versus shared memory systems –Primitives for distributed communication –Synchronous versus asynchronous executions –Design issues and challenges" in chapter "Introduction to Distributed Systems & Clocks"
- sem 7: Retire topic "Note: The detailed syllabus page for this course prints L-T-P-C as 3-0-0-3" in chapter "Digital Forensics"
- sem 7: Retire topic "the credits shown here follow the official course structure table" in chapter "Digital Forensics"
- sem 7: Retire topic "Scrum, XP, Lean, and Kanban" in chapter "Understanding of Agile Process"
- sem 7: Retire topic "Advanced Pre- training for Language Models" in chapter "Deep Learning for NLP & LLM"
- sem 7: Retire topic "6Lo" in chapter "Iot PROTOCOLS"
- sem 7: Retire topic "Application layer protocols- CoAP" in chapter "Iot PROTOCOLS"
- sem 7: Retire topic "etc" in chapter "Cross-Domain Integration of Autonomous Systems"

</details>

### ece

<details><summary>course missing from branch/semester (4)</summary>

- sem 1: Link pdeu-environmental-science-biotech to ece sem 1 (name 1.00, topics 0.47)
- sem 2: Link pdeu-elements-of-electrical-and-electronics-engineering-biotech to ece sem 2 (name 1.00, topics 0.46)
- sem 6: Link pdeu-computer-communication-and-networking to ece sem 6 (name 1.00, topics 0.76)
- sem 7: Link pdeu-embedded-systems to ece sem 7 (name 1.00, topics 0.53)

</details>

<details><summary>new practical course (21)</summary>

- sem 1: Add lab "Applied Physics Laboratory" (13 experiments), related to Applied Physics
- sem 1: Add lab "Workshop Practice" (10 experiments)
- sem 1: Add lab "Computer Programming – I Laboratory" (9 experiments), related to Computer Programming – I
- sem 2: Add lab "Engineering Chemistry Practical" (11 experiments), related to Engineering Chemistry
- sem 2: Add lab "Elements of Electrical and Electronics Engineering Laboratory" (13 experiments), related to Elements of Electrical and Electronics Engineering
- sem 2: Add lab "Engineering Graphics - Laboratory" (9 experiments)
- sem 2: Add lab "Computer Programming-II Laboratory" (8 experiments), related to Computer Programming-II
- sem 3: Add lab "Digital Circuits Lab" (10 experiments), related to Digital Circuits
- sem 3: Add lab "Electronics Devices and Circuits Lab" (12 experiments), related to Electronics Devices and Circuits
- sem 4: Add lab "Analog Electronics Lab" (14 experiments), related to Analog Electronics
- sem 4: Add lab "Analog Communication Lab" (12 experiments), related to Analog Communication
- sem 4: Add lab "Digital Signal Processing Lab" (13 experiments), related to Digital Signal Processing
- sem 5: Add lab "Linear Integrated Circuits and Applications Lab" (12 experiments), related to Linear Integrated Circuits and Applications
- sem 5: Add lab "Digital Communication Lab" (12 experiments), related to Digital Communication
- sem 5: Add lab "Control Systems Laboratory" (16 experiments), related to Control Systems
- sem 6: Add lab "Computer Communication and Networking Lab" (12 experiments), related to Computer Communication and Networking
- sem 6: Add lab "Computer Organization and Microprocessor Lab" (12 experiments), related to Computer Organization and Microprocessor
- sem 6: Add lab "Microwave and Antenna Engineering Lab" (11 experiments)
- sem 7: Add lab "Modern Wireless Communication Lab" (11 experiments)
- sem 7: Add lab "Embedded Systems Lab" (9 experiments), related to Embedded Systems
- sem 7: Add lab "Digital CMOS VLSI Design Lab" (10 experiments), related to Digital CMOS VLSI Design

</details>

<details><summary>unit missing (2)</summary>

- sem 7: Add unit 1 "Introduction to Wireless Communications" (4 topics) to pdeu-modern-wireless-communication
- sem 7: Add unit 1 "Introduction to 5G Broadband Wireless Communications" (8 topics) to pdeu-advanced-communication-networks-communication

</details>

<details><summary>topic under wrong unit (5)</summary>

- sem 3: Move topic "C and Controlled sources" from chapter "Multi Port Circuits Analysis" to "Continuous Time Signals, Circuits and Systems"
- sem 3: Move topic "poles and zeros: stability and causality" from chapter "Laplace Transform Applications to System and Circuit Analysis" to "Continuous Time Signals, Circuits and Systems"
- sem 4: Move topic "Practical Filters: Stability and Causality" from chapter "Digital Filters: Design and Structures" to "Discrete Time Signals and Systems"
- sem 7: Move topic "Introduction to Radar: Basic Radar" from chapter "1radar Fundamentals" to "Radar Transmitters and Signal Detection"
- sem 7: Move topic "Sampling" from chapter "Introduction to Mixed-signal" to "NOISE AND TESTING OF ICs"

</details>

<details><summary>topic missing (40)</summary>

- sem 3: Add topic "Continuous time LTI systems models in time domain: Linear Constant Coefficient Differential Equations" to chapter "Continuous Time Signals, Circuits and Systems"
- sem 3: Add topic "Interconnections of Systems" to chapter "Continuous Time Signals, Circuits and Systems"
- sem 4: Add topic "FrequencyDomain representation" to chapter "Amplitude Modulation"
- sem 4: Add topic "Pre-emphasis and Deemphasis in FM" to chapter "Noise in Analog Communication Systems"
- sem 4: Add topic "Coaxial and Spherical capacitors" to chapter "Electrostatics"
- sem 4: Add topic "λ/2 and λ/inesImpedance Transformations" to chapter "Transmission Lines"
- sem 4: Add topic "Block Diagram Representation, Interconnections" to chapter "Discrete Time Signals and Systems"
- sem 4: Add topic "Sampling and Sampling theorem, Reconstruction, Aliasing" to chapter "Discrete Time Signals and Systems"
- sem 4: Add topic "Concept of quantization, A to D and D to A conversion" to chapter "Discrete Time Signals and Systems"
- sem 4: Add topic "Discrete time vs. digital signal processing" to chapter "Discrete Time Signals and Systems"
- sem 5: Add topic "Channel Capacity" to chapter "Fundamental Digital Communication Parameters"
- sem 5: Add topic "Differential PulseCode Modulation" to chapter "Optimal Design of Digital Receiver and Waveform Coding Techniques"
- sem 5: Add topic "Analogy with electronic systems analysis and design" to chapter "Frequency Domain Analysis and Design"
- sem 5: Add topic "GATE LEVEL AND DATA FLOWIntroduction" to chapter "Introduction to Verilog HDL and Modelling Style: Gate Level and Data"
- sem 6: Add topic "Space Time Trellis Codes" to chapter "Convolution Codes & Trellis Coded Modulation"
- sem 6: Add topic "Conceptual data modeling, motivation, entities" to chapter "Conceptual Modeling Introduction"
- sem 6: Add topic "entity types" to chapter "Conceptual Modeling Introduction"
- sem 6: Add topic "various types of attributes, relationships" to chapter "Conceptual Modeling Introduction"
- sem 6: Add topic "relationship types" to chapter "Conceptual Modeling Introduction"
- sem 6: Add topic "E/R diagram notation, examples" to chapter "Conceptual Modeling Introduction"
- sem 6: Add topic "schemainstance distinction, keys" to chapter "Conceptual Modeling Introduction"
- sem 6: Add topic "drones and Multiagent systems" to chapter "Modern Controllers and Estimators"
- sem 6: Add topic "drive and switching aid circuits" to chapter "Power Amplifiers and Power Semiconductor Devices"
- sem 7: Add topic "ADSP-21xx Development tools" to chapter "Digital Signal Processors"
- sem 7: Add topic "Types of Cache, Split, D –Caches" to chapter "Memory Design for SoC"
- sem 7: Add topic "LTE/NR Interworking and Coexistence" to chapter "5G Physical Layer and Application"
- sem 7: Add topic "Resolution and depth of focus" to chapter "Lithography and Oxidation Processes"
- sem 7: Add topic "Photoresists: types, issues" to chapter "Lithography and Oxidation Processes"
- sem 7: Add topic "Copper interconnects, Advantages" to chapter "Etching and Back-end Technology"
- sem 7: Add topic "hexa and octacopters, etc.), hybrid" to chapter "INTRODUCTION TO DRONES and ITS MECHATRONIC COMPONENTS"
- sem 7: Add topic "Limitations to MTI Performance" to chapter "1radar Fundamentals"
- sem 7: Add topic "FrequencyScan Arrays" to chapter "Radar Receivers"
- sem 7: Add topic "Radar Cross Section of Targets" to chapter "Radar Transmitters and Signal Detection"
- sem 7: Add topic "Radar cross Section fluctuations" to chapter "Radar Transmitters and Signal Detection"
- sem 7: Add topic "Transmitter Power" to chapter "Radar Transmitters and Signal Detection"
- sem 7: Add topic "Testing: General Consideration" to chapter "NOISE AND TESTING OF ICs"
- sem 7: Add topic "D/A converters" to chapter "NOISE AND TESTING OF ICs"
- sem 7: Add topic "A/D convertors: static and dynamic testing, Project" to chapter "NOISE AND TESTING OF ICs"
- sem 7: Add topic "Handling vanishing gradient problem, Dropout" to chapter "Convolutional Neural Networks"
- sem 7: Add topic "Batch Normalization" to chapter "Convolutional Neural Networks"

</details>

<details><summary>topic split (145)</summary>

- sem 1: Split topic "Hall Effect, and magnetic materials" into "Hall Effect", "magnetic materials" (first keeps id hall-effect)
- sem 3: Split topic "signed/unsigned binary, octal and hexadecimal arithmetic" into "signed/unsigned binary", "octal and hexadecimal arithmetic" (first keeps id signed-unsigned-binary-octal-and-hexadecimal-arithmetic)
- sem 3: Split topic "Excess-3 codes, Logic Gates, and Truth Table" into "Excess-3 codes", "Logic Gates", "Truth Table" (first keeps id excess-3-codes-logic-gates-and-truth-table)
- sem 3: Split topic "Error detection and correction codes - parity check codes and Hamming codes" into "Error detection and correction codes", "parity check codes and Hamming codes" (first keeps id error-detection-and-correction-codes-parity-check-codes-and)
- sem 3: Split topic "Arithmetic modules- ripple carry adder, subtractor, carry look ahead adder" into "Arithmetic modules- ripple carry adder, subtractor", "carry look ahead adder" (first keeps id arithmetic-modules-ripple-carry-adder-subtractor-carry-look)
- sem 3: Split topic "basic multiplier, BCD Adder" into "basic multiplier", "BCD Adder" (first keeps id basic-multiplier-bcd-adder)
- sem 3: Split topic "Latches and flip-flops: SR-latch" into "Latches and flip-flops: SR-latch, D-latch", "JK flip-flops and T flip-flops" (first keeps id latches-and-flip-flops-sr-latch)
- sem 3: Split topic "D flip-flop" into "D flip-flop", "JK flip-flop", "T flip-flop" (first keeps id d-flip-flop)
- sem 3: Split topic "Moore and Mealy Finite State Machines (FSM): state diagram, state table, state assignment" into "Moore and Mealy Finite State Machines (FSM): state diagram", "state table", "state assignment" (first keeps id finite-state-machines)
- sem 3: Split topic "Implementation of FSM using Decoders, OR gates, Multiplexors and ROM. Various Registers and counters: asynchronous counters, synchronous counters" into "Implementation of FSM using Decoders, gates", "Multiplexors and ROM", "Various Registers and counters: asynchronous counters", "synchronous counters" (first keeps id implementation-of-fsm-using-decoders-or-gates-multiplexors)
- sem 3: Split topic "ring counter, Johnson counter" into "ring counter", "Johnson counter" (first keeps id ring-counter-johnson-counter)
- sem 3: Split topic "programmable logic array" into "programmable logic array", "programmable array logic" (first keeps id programmable-logic-array)
- sem 3: Split topic "Junctions: Metal/Semiconductor (Schottky barrier height, rectifying and ohmic contacts)" into "Junctions: Metal/Semiconductor (Schottky barrier height", "rectifying and ohmic contacts)" (first keeps id pn-junction-physics)
- sem 3: Split topic "different transient circuit configuration (CB, CE and CC)" into "different transient circuit configuration (CB", "CE and CC)" (first keeps id different-transient-circuit-configuration-cb-ce-and-cc)
- sem 4: Split topic "Analysis of CE, CC, and CB Amplifiers" into "Analysis of CE", "CB Amplifiers" (first keeps id analysis-of-ce-cc-and-cb-amplifiers)
- sem 4: Split topic "Miller‟s Theorem" into "Miller‟s Theorem", "Dual of Miller‟s theorem" (first keeps id miller-s-theorem)
- sem 4: Split topic "Wien‟s bridge, and crystal oscillator" into "crystal oscillator", "Wien‟s bridge", "crystal oscillator" (first keeps id wien-s-bridge-and-crystal-oscillator)
- sem 4: Split topic "Correlation and Covariance function: Principles of autocorrelation function" into "Correlation and Covariance function: Principles of autocorrelation function, cross", "correlation functions" (first keeps id correlation-and-covariance-function-principles-of)
- sem 4: Split topic "Properties of Gaussian process. Measure of central tendency:" into "Properties of Gaussian process", "Measure of central tendency" (first keeps id properties-of-gaussian-process-measure-of-central-tendency)
- sem 4: Split topic "AM: Time-Domain description" into "AM: Time-Domain description, Frequency", "Domain description" (first keeps id am-time-domain-description)
- sem 4: Split topic "switching modulator. Detection of AM waves: square law detector" into "switching modulator", "Detection of AM waves: square law detector" (first keeps id switching-modulator-detection-of-am-waves-square-law)
- sem 4: Split topic "ring modulator. Coherent detection of DSBSC modulated waves" into "ring modulator", "Coherent detection of DSBSC modulated waves" (first keeps id ring-modulator-coherent-detection-of-dsbsc-modulated-waves)
- sem 4: Split topic "Costas loop. Quadrature carrier multiplexing" into "Costas loop", "Quadrature carrier multiplexing" (first keeps id costas-loop-quadrature-carrier-multiplexing)
- sem 4: Split topic "transmission bandwidth of FM waves" into "transmission bandwidth of FM waves", "generation of FM waves: indirect FM and direct FM" (first keeps id transmission-bandwidth-of-fm-waves)
- sem 4: Split topic "Equivalent noise temperature. Noise in DSB-SC receivers" into "Equivalent noise temperature", "Noise in DSB-SC receivers" (first keeps id equivalent-noise-temperature-noise-in-dsb-sc-receivers)
- sem 4: Split topic "Continuous Time and Discrete Time Signals, Analog and Digital Signals" into "Continuous Time and Discrete Time Signals", "Analog and Digital Signals" (first keeps id continuous-time-and-discrete-time-signals-analog-and-digital)
- sem 4: Split topic "Definition and Examples, Classification of Discrete Time Signals, Energy, Power, Periodicity, Signal operations, Discrete time elementary signals, Discrete Time Systems" into "Definition and Examples", "Classification of Discrete Time Signals, Energy, Power, Periodicity", "Signal operations", "Discrete time elementary signals", "Discrete Time Systems, Definition, Classification" (first keeps id definition-and-examples-classification-of-discrete-time)
- sem 4: Split topic "Definition, Classification, Discrete time LTI system and unit impulse (sample) response, Convolution sum, Linear constant co-efficient difference equation representation, Block Diagram Representation," into "Discrete time LTI system and unit impulse (sample) response", "Convolution sum", "Linear constant co-efficient difference equation representation" (first keeps id linear-systems)
- sem 4: Split topic "IIR Filter Design" into "IIR Filter Design", "IIR Filter Coefficients from Analog Filter" (first keeps id iir-filter-design)
- sem 5: Split topic "Active RC Filters: Idealistic & Realistic response of filters (Low pass, High pass, Band pass and Band reject)" into "Active RC Filters: Idealistic & Realistic response of filters (Low pass", "High pass", "Band pass and Band reject)" (first keeps id active-filters)
- sem 5: Split topic "Sine wave generator (Phase shift, Wein bridge, Hartley, Colpitts, and Crystal oscillator)" into "Sine wave generator (Phase shift", "Wein bridge, Hartley, Colpitts", "Crystal oscillator)" (first keeps id sine-wave-generator-phase-shift-wein-bridge-hartley-colpitts)
- sem 5: Split topic "Bistable and Monostable Multivibrators. Introduction to OTA" into "Bistable and Monostable Multivibrators", "Introduction to OTA" (first keeps id bistable-and-monostable-multivibrators-introduction-to-ota)
- sem 5: Split topic "Analog-to-Digital Converter" into "Analog-to-Digital Converter", "Digital-to-Analog Converter" (first keeps id analog-to-digital-converter)
- sem 5: Split topic "Sources and Signals, Basic Signal Processing, Sampling Theorem" into "Sources and Signals", "Basic Signal Processing", "Sampling Theorem" (first keeps id sampling-theorem)
- sem 5: Split topic "Practical Aspects of Sampling and Signal Recovery, Time-Division Multiplexing, Uncertainty, Information, Entropy, Source Coding Theorem, Huffman Coding, Discrete Memoryless Channels, Mutual Informatio" into "Practical Aspects of Sampling and Signal Recovery", "Time-Division Multiplexing, Uncertainty, Information", "Entropy", "Source Coding Theorem", "Huffman Coding", "Discrete Memoryless Channels", "Mutual Information", "Channel Coding Theorem" (first keeps id tdm-comm)
- sem 5: Split topic "Introduction to Linear and Non-linear control systems, Notion of feedback, Open-loop and closed-loop control systems, Examples of Control Systems, Design and Compensation of Control Systems" into "Introduction to Linear and Non-linear control systems", "Notion of feedback", "Open-loop and closed-loop control systems", "Examples of Control Systems", "Design and Compensation of Control Systems" (first keeps id introduction-to-linear-and-non-linear-control-systems-notion)
- sem 5: Split topic "Mathematical modelling and analogy, Differential equations, Transfer Function and Impulse-Response Function, Systems with transport lag, Linearization" into "Mathematical modelling and analogy", "Differential equations", "Transfer Function and Impulse-Response Function", "Systems with transport lag, Linearization" (first keeps id mathematical-modelling-and-analogy-differential-equations)
- sem 5: Split topic "Gain and Phase margins, Bode plots, Frequency domain specifications and their correlations with time response, Design and performance goals" into "Gain and Phase margins", "Bode plots", "Frequency domain specifications and their correlations with time response", "Design and performance goals" (first keeps id bode-plots-control)
- sem 5: Split topic "Introduction to modern control systems, and way forward" into "Introduction to modern control systems", "way forward" (first keeps id introduction-to-modern-control-systems-and-way-forward)
- sem 5: Split topic "Modes & Rays. Basic Optical Communication System" into "Modes & Rays", "Basic Optical Communication System" (first keeps id modes-and-rays-basic-optical-communication-system)
- sem 5: Split topic "Network Topologies. Advanced Multiplexing Strategies- OFDM" into "Network Topologies", "Advanced Multiplexing Strategies- OFDM" (first keeps id network-topologies-advanced-multiplexing-strategies-ofdm)
- sem 5: Split topic "SDM. Subcarrier Multiplexing" into "SDM", "Subcarrier Multiplexing" (first keeps id sdm-subcarrier-multiplexing)
- sem 5: Split topic "Review of Combinational and Sequential logic design, Moore and Mealy machine, Design of synchronous sequential circuits" into "Review of Combinational and Sequential logic design", "Moore and Mealy machine", "Design of synchronous sequential circuits" (first keeps id review-of-combinational-and-sequential-logic-design-moore)
- sem 5: Split topic "state diagram, state table, state table assignment and reduction, design of iterative circuits" into "state diagram", "state table", "state table assignment and reduction", "design of iterative circuits" (first keeps id state-diagram-state-table-state-table-assignment-and)
- sem 5: Split topic "ASM chart and realization of ASM chart, Timing issues in sequential circuits" into "ASM chart and realization of ASM chart", "Timing issues in sequential circuits" (first keeps id asm-chart-and-realization-of-asm-chart-timing-issues-in)
- sem 5: Split topic "Gate level modelling: Introduction, AND Gate Primitive" into "Gate level modelling: Introduction", "Gate Primitive" (first keeps id gate-level-modelling-introduction-and-gate-primitive)
- sem 5: Split topic "power dissipation" into "power dissipation", "Power dissipation" (first keeps id power-dissipation)
- sem 5: Split topic "Programmable interconnect - Partitioning and Placement" into "Programmable interconnect", "Partitioning and Placement" (first keeps id programmable-interconnect-partitioning-and-placement)
- sem 6: Split topic "Introduction to FSM, Moore, and Mealy machines. The basic architecture of micro-computer and Central processing unit" into "Introduction to FSM, Moore", "Mealy machines", "The basic architecture of micro-computer and Central processing unit" (first keeps id introduction-to-fsm-moore-and-mealy-machines-the-basic)
- sem 6: Split topic "design of Basic central processing unit. Hardwired and microprogrammed control Units" into "design of Basic central processing unit", "Hardwired and microprogrammed control Units" (first keeps id hardwired-control)
- sem 6: Split topic "arithmetic and instruction pipeline. Memory organization" into "arithmetic and instruction pipeline", "Memory organization" (first keeps id arithmetic-and-instruction-pipeline-memory-organization)
- sem 6: Split topic "Pin diagram, signals, and register set of 8086. Addressing modes" into "Pin diagram, signals", "register set of 8086", "Addressing modes" (first keeps id pin-diagram-signals-and-register-set-of-8086-addressing)
- sem 6: Split topic "interfacing PPI 8255, and Interrupt controller 8259" into "interfacing PPI 8255", "Interrupt controller 8259" (first keeps id interfacing-ppi-8255-and-interrupt-controller-8259)
- sem 6: Split topic "radiation mechanism" into "radiation mechanism", "Radiation mechanism" (first keeps id radiation-mechanism)
- sem 6: Split topic "image theory and monopole antenna. Aperture antennas: waveguide" into "image theory and monopole antenna", "Aperture antennas: waveguide" (first keeps id image-theory-and-monopole-antenna-aperture-antennas)
- sem 6: Split topic "horn and reflector antennas. Basic characteristics of microstrip antennas" into "horn and reflector antennas", "Basic characteristics of microstrip antennas" (first keeps id horn-and-reflector-antennas-basic-characteristics-of)
- sem 6: Split topic "design of rectangular and circular patch antennas. Antenna Array: Two element arrays" into "design of rectangular and circular patch antennas", "Antenna Array: Two element arrays" (first keeps id design-of-rectangular-and-circular-patch-antennas-antenna)
- sem 6: Split topic "directional couplers, circulators, and isolators. Microwave filters. Microwave Semiconductor Devices: Gunn Diodes" into "directional couplers, circulators, isolators", "Microwave filters", "Microwave Semiconductor Devices: Gunn Diodes" (first keeps id directional-couplers-circulators-and-isolators-microwave)
- sem 6: Split topic "Neural Network" into "Neural Network", "Convolutional Neural Network" (first keeps id cnn)
- sem 6: Split topic "(One class classification, Multiclass Classification)" into "(One class classification", "Multiclass Classification)" (first keeps id one-class-classification-multiclass-classification)
- sem 6: Split topic "Cyclic codes" into "Cyclic codes", "Generation and Decoding of Cyclic codes", "Circuit Implementation of Cyclic Codes" (first keeps id cyclic-codes)
- sem 6: Split topic "Database - DBMS distinction, approaches to building a database, data models, database management system, three-schema architecture of a database, challenges in building a DBMS, various components of a" into "DBMS distinction", "approaches to building a database", "data models", "database management system", "three-schema architecture of a database", "challenges in building a DBMS", "various components of a DBMS.E/R Model" (first keeps id er-model)
- sem 6: Split topic "dependency theory - functional dependencies" into "dependency theory", "functional dependencies" (first keeps id dependency-theory-functional-dependencies)
- sem 6: Split topic "3NF and BCNF" into "3NF and BCNF", "algorithms for 3NF and BCNF normalization" (first keeps id 3nf-and-bcnf)
- sem 6: Split topic "deadlock handling. Recovery: Failure classification" into "deadlock handling", "Recovery: Failure classification" (first keeps id deadlock-handling-recovery-failure-classification)
- sem 6: Split topic "Navigation and mapping. Types of robots: Stationary and Mobile robots" into "Navigation and mapping", "Types of robots: Stationary and Mobile robots" (first keeps id navigation-and-mapping-types-of-robots-stationary-and-mobile)
- sem 6: Split topic "Basics: Configuration space, DOFs, Fully actuated, underactuated & overactuated robots" into "Basics: Configuration space, DOFs", "Fully actuated", "underactuated & overactuated robots" (first keeps id basics-configuration-space-dofs-fully-actuated-underactuated)
- sem 6: Split topic "Kinematic modeling: Motions in 3D, Positions & rotations, Coordinate frames & transformations, Euler angles, Forward & inverse kinematics" into "Kinematic modeling: Motions in 3D", "Positions & rotations", "Coordinate frames & transformations", "Euler angles", "Forward & inverse kinematics" (first keeps id kinematic-modeling-motions-in-3d-positions-and-rotations)
- sem 6: Split topic "Dynamical modeling: Kinetic & potential energy, Robot motions using Euler-Lagrange formulation" into "Dynamical modeling: Kinetic & potential energy", "Robot motions using Euler-Lagrange formulation" (first keeps id dynamical-modeling-kinetic-and-potential-energy-robot)
- sem 6: Split topic "Modelling examples: 2-link robotic manipulators, Inverted pendulum on a cart, Slosh-container" into "Modelling examples: 2-link robotic manipulators", "Inverted pendulum on a cart", "Slosh-container" (first keeps id modelling-examples-2-link-robotic-manipulators-inverted)
- sem 6: Split topic "State-space modeling: State variables, Linear & nonlinear system equations, Eigen structure" into "State-space modeling: State variables", "Linear & nonlinear system equations", "Eigen structure" (first keeps id linear-systems)
- sem 6: Split topic "Using AI/ML for control systems. Motion Planning: Motivating examples" into "Using AI/ML for control systems", "Motion Planning: Motivating examples" (first keeps id using-ai-ml-for-control-systems-motion-planning-motivating)
- sem 6: Split topic "Simulations: 2DOF underactuated robot, Quadrotor drone" into "SIMULATIONS, EXPERIMENTS & Simulations: 2DOF underactuated robot", "Quadrotor drone" (first keeps id simulations-2dof-underactuated-robot-quadrotor-drone)
- sem 6: Split topic "Experimental robotics: How to build a robot using Arduino like microcontrollers, Practical aspects for ground & flying robots/drones" into "Experimental robotics: How to build a robot using Arduino like microcontrollers", "Practical aspects for ground & flying robots/drones" (first keeps id experimental-robotics-how-to-build-a-robot-using-arduino)
- sem 6: Split topic "Programming & simulators: Introduction to ROS: Concepts & basic programming, Introduction to Gazebo Simulator: The environment, Building a simple robot in Gazebo" into "Programming & simulators: Introduction to ROS: Concepts & basic programming", "Introduction to Gazebo Simulator: The environment", "Building a simple robot in Gazebo" (first keeps id programming-and-simulators-introduction-to-ros-concepts-and)
- sem 6: Split topic "Multiple robots based applications: Multi-agent systems, Surveillance, Monitoring, Package delivery, Agriculture, Smart solutions" into "Multiple robots based applications: Multi-agent systems, Surveillance, Monitoring", "Package delivery, Agriculture", "Smart solutions" (first keeps id multiple-robots-based-applications-multi-agent-systems)
- sem 6: Split topic "Introduction to Geo-synchronous and Geo-stationary satellites. Orbital Mechanics" into "Introduction to Geo-synchronous and Geo-stationary satellites", "Orbital Mechanics" (first keeps id introduction-to-geo-synchronous-and-geo-stationary)
- sem 6: Split topic "Tracking and command control system, and Power supply system. Satellite Link Design: Basic transmission theory" into "Tracking and command control system", "Power supply system", "Satellite Link Design: Basic transmission theory" (first keeps id tracking-and-command-control-system-and-power-supply-system)
- sem 6: Split topic "Nonlinear Systems" into "Nonlinear Systems", "Local behaviour of nonlinear systems" (first keeps id nonlinear-systems)
- sem 6: Split topic "State feedback control with pole placement" into "State feedback control with pole placement", "Output feedback control with pole placement" (first keeps id state-feedback-control-with-pole-placement)
- sem 6: Split topic "Future trends and the way forward - Control and estimation for modern applications like robotics" into "Future trends and the way forward", "Control and estimation for modern applications like robotics" (first keeps id future-trends-and-the-way-forward-control-and-estimation-for)
- sem 6: Split topic "Operation and analysis of power Amplifiers: Class A, B, C and push-pull configurations" into "Operation and analysis of power Amplifiers: Class A", "C and push-pull configurations" (first keeps id operation-and-analysis-of-power-amplifiers-class-a-b-c-and)
- sem 6: Split topic "performance parameters analysis: power factor, ripple factor, form factor, harmonics, distortion and effect of source Inductance on performance" into "performance parameters analysis: power factor", "ripple factor", "form factor, harmonics", "distortion and effect of source Inductance on performance" (first keeps id performance-parameters-analysis-power-factor-ripple-factor)
- sem 6: Split topic "Design of chopper-based Buck converter, Boost converter, Buck-Boost and Cuk converter: circuit configuration and steady state time domain Analysis with different kinds of loads" into "Design of chopper-based Buck converter", "Boost converter", "Buck-Boost and Cuk converter: circuit configuration and steady state time domain Analysis with different kinds of loads" (first keeps id design-of-chopper-based-buck-converter-boost-converter-buck)
- sem 6: Split topic "AC-AC converter: single phase AC Voltage controllers, AC chopper" into "AC-AC converter: single phase AC Voltage controllers", "AC chopper" (first keeps id ac-ac-converter-single-phase-ac-voltage-controllers-ac)
- sem 6: Split topic "Classification of inverters, single phase voltage source bridge inverter" into "Classification of inverters", "single phase voltage source bridge inverter" (first keeps id classification-of-inverters-single-phase-voltage-source)
- sem 6: Split topic "Introduction to MOSFETs, MOSFET-Circuits Configurations: Common-Source, Source Follower, Common- Gate, Cascode, and Basic Differential Pair" into "Introduction to MOSFETs", "MOSFET-Circuits Configurations: Common-Source", "Source Follower", "Common- Gate, Cascode", "Basic Differential Pair" (first keeps id introduction-to-mosfets-mosfet-circuits-configurations)
- sem 6: Split topic "Current Mirrors: Basic Current Mirrors, Cascode Current Mirrors, and Active Current Mirrors" into "Current Mirrors: Basic Current Mirrors", "Cascode Current Mirrors", "Active Current Mirrors" (first keeps id current-mirror)
- sem 6: Split topic "Biasing Techniques: CS Biasing, CG Biasing, Source Follower Biasing, Differential Pair Biasing" into "Biasing Techniques: CS Biasing", "CG Biasing", "Source Follower Biasing", "Differential Pair Biasing" (first keeps id biasing-techniques-cs-biasing-cg-biasing-source-follower)
- sem 6: Split topic "Current-Voltage Feedback" into "Current-Voltage Feedback", "Voltage-Current Feedback", "Current-Current Feedback" (first keeps id current-voltage-feedback)
- sem 7: Split topic "Path Loss and Shadowing: Radio Wave Propagation, Transmit & Receive Signal Models, Free-Space Path Loss, Shadow Fading" into "Path Loss and Shadowing: Radio Wave Propagation", "Transmit & Receive Signal Models", "Free-Space Path Loss", "Shadow Fading" (first keeps id path-loss-and-shadowing-radio-wave-propagation-transmit-and)
- sem 7: Split topic "Statistical Multipath Channel Models: Narrowband and Wideband Fading, Rayleigh and Rician Fading Distribution" into "Statistical Multipath Channel Models: Narrowband and Wideband Fading", "Rayleigh and Rician Fading Distribution" (first keeps id statistical-multipath-channel-models-narrowband-and-wideband)
- sem 7: Split topic "Performance Analysis over Fading Channel: Outage Probability, Average Probability of Error, Capacity" into "Performance Analysis over Fading Channel: Outage Probability", "Average Probability of Error, Capacity" (first keeps id performance-analysis-over-fading-channel-outage-probability)
- sem 7: Split topic "SIMO, MISO and MIMO Models" into "SIMO", "MISO and MIMO Models" (first keeps id simo-miso-and-mimo-models)
- sem 7: Split topic "Receiver Diversity: Selection Combining, Equal Gain Combining, Maximal-Ratio Combining, Transmit Diversity: Alamouti Space-Time Coding Scheme" into "Receiver Diversity: Selection Combining", "Equal Gain Combining", "Maximal-Ratio Combining", "Transmit Diversity: Alamouti Space-Time Coding Scheme" (first keeps id receiver-diversity-selection-combining-equal-gain-combining)
- sem 7: Split topic "Spread Spectrum Communication: Spread Spectrum Principles, Direct Sequence Spread Spectrum, Frequency Hoping Spread Spectrum" into "Spread Spectrum Communication: Spread Spectrum Principles", "Direct Sequence Spread Spectrum", "Frequency Hoping Spread Spectrum" (first keeps id spread-spectrum-communication-spread-spectrum-principles)
- sem 7: Split topic "Multicarrier Modulation Schemes: Orthogonal Frequency Division Multiplexing (OFDM), Cyclic Prefix, Case Study: The IEEE 802.11a Wireless LAN Standard" into "Multicarrier Modulation Schemes: Orthogonal Frequency Division Multiplexing (OFDM)", "Cyclic Prefix", "Case Study: The IEEE 802.11a Wireless LAN Standard" (first keeps id multicarrier-modulation-schemes-orthogonal-frequency)
- sem 7: Split topic "Trends in VLSI/Semiconductor industry, related to technology (Moore‟s) scaling" into "Trends in VLSI/Semiconductor industry", "related to technology (Moore‟s) scaling" (first keeps id trends-in-vlsi-semiconductor-industry-related-to-technology)
- sem 7: Split topic "Overview of semiconductor devices inherent in the MOSFET: MOSFET I/V Characteristics, MOSFET C/V Characteristics, Second Order Effects" into "Overview of semiconductor devices inherent in the MOSFET: MOSFET I/V Characteristics", "MOSFET C/V Characteristics", "Second Order Effects" (first keeps id overview-of-semiconductor-devices-inherent-in-the-mosfet)
- sem 7: Split topic "DC Transfer Characteristics: CMOS inverter DC Characteristics, Beta Ratio Effects, Noise Margins, Pass Transistor DC Characteristics" into "DC Transfer Characteristics: CMOS inverter DC Characteristics", "Beta Ratio Effects", "Noise Margins", "Pass Transistor DC Characteristics" (first keeps id dc-transfer-characteristics-cmos-inverter-dc-characteristics)
- sem 7: Split topic "Delay in Multistage Logic Networks. Timing analysis delay models Power: Sources of power" into "Delay in Multistage Logic Networks", "Timing analysis delay models Power: Sources of power" (first keeps id delay-in-multistage-logic-networks-timing-analysis-delay)
- sem 7: Split topic "CPL, transmission gates, DPL, etc)" into "CPL", "transmission gates", "DPL, etc)" (first keeps id cpl-transmission-gates-dpl-etc)
- sem 7: Split topic "Dynamic logic (domino, NP domino, Zipper)" into "Dynamic logic (domino", "NP domino, Zipper)" (first keeps id dynamic-logic-domino-np-domino-zipper)
- sem 7: Split topic "Hybrid logic style and examples (Full-Adder, MUX, XOR), Pitfalls of various families, Stick diagram" into "Hybrid logic style and examples (Full-Adder", "MUX, XOR)", "Pitfalls of various families", "Stick diagram" (first keeps id hybrid-logic-style-and-examples-full-adder-mux-xor-pitfalls)
- sem 7: Split topic "Sequential Design: Sequencing Static Circuits, Max-Delay Constraints, Min-Delay Constraints, Time Borrowing, Clock Skew, Circuit Design of Latches and Flip-Flops" into "Sequential Design: Sequencing Static Circuits", "Min-Delay Constraints", "Time Borrowing", "Clock Skew", "Circuit Design of Latches and Flip-Flops" (first keeps id sequential-design-sequencing-static-circuits-max-delay)
- sem 7: Split topic "Carry ripple adder, carry look ahead adder, Manchester carry chain adder, carry skip adder, carry select adder, shifters, multipliers, SRAM, DRAM, and other memories" into "Carry ripple adder", "carry look ahead adder", "Manchester carry chain adder", "carry skip adder", "carry select adder, shifters, multipliers", "SRAM", "DRAM", "other memories" (first keeps id carry-ripple-adder-carry-look-ahead-adder-manchester-carry)
- sem 7: Split topic "introduction to ARM series processors and its versions: architectures, features, advantages & suitability in SoC design" into "introduction to ARM series processors and its versions: architectures, features", "advantages & suitability in SoC design" (first keeps id introduction-to-arm-series-processors-and-its-versions)
- sem 7: Split topic "ARM instruction set" into "ARM instruction set", "Instruction set" (first keeps id arm-instruction-set)
- sem 7: Split topic "ARM 7 based Microcontroller: features, architecture (block diagram and its description),Memory Map, GPIO, Pin Connect Block, Instruction set, programming in assembly language" into "ARM 7 based Microcontroller: features", "architecture (block diagram and its description)", "Memory Map", "GPIO", "Pin Connect Block", "programming in assembly language" (first keeps id assembly-programming)
- sem 7: Split topic "Hardware architecture of DSP Processor: desirable features of DSP processors, types of architectures, internal architecture, features, system interface and instruction set of ADSP21xx, ADSP-21xx Devel" into "Hardware architecture of DSP Processor: desirable features of DSP processors", "types of architectures", "internal architecture, features", "system interface and instruction set of ADSP21xx" (first keeps id hardware-architecture-of-dsp-processor-desirable-features-of)
- sem 7: Split topic "Internal Memory: size, Scratchpads and Cache memory, Cache Organization, Cache data, Write Policies, Strategies for line replacement at miss time, Types of Cache, Split" into "Internal Memory: size", "Scratchpads and Cache memory", "Cache Organization", "Cache data", "Write Policies", "Strategies for line replacement at miss time" (first keeps id cache-replacement-write)
- sem 7: Split topic "I, and D –Caches, Multilevel Caches, SoC Memory System" into "Multilevel Caches", "SoC Memory System" (first keeps id i-and-d-caches-multilevel-caches-soc-memory-system)
- sem 7: Split topic "Models of Simple Processor – memory interaction" into "Models of Simple Processor", "memory interaction" (first keeps id models-of-simple-processor-memory-interaction)
- sem 7: Split topic "An overview, Customizing Instruction Processor, Reconfiguration Technologies, Mapping design onto Reconfigurable devices, Reconfiguration" into "An overview, Customizing Instruction Processor", "Reconfiguration Technologies", "Mapping design onto Reconfigurable devices, Reconfiguration" (first keeps id an-overview-customizing-instruction-processor)
- sem 7: Split topic "Inter Connect Architectures: Basic Bus Architectures, Analytical Bus Models, Bus transactions and contention time" into "Inter Connect Architectures: Basic Bus Architectures", "Analytical Bus Models", "Bus transactions and contention time" (first keeps id inter-connect-architectures-basic-bus-architectures)
- sem 7: Split topic "SoC Standard Buses (AMBA, Core connect)" into "SoC Standard Buses (AMBA", "Core connect)" (first keeps id soc-standard-buses-amba-core-connect)
- sem 7: Split topic "Moore‟s law, CMOS scaling, Overview of key semiconductor technologies, Crystal Structure: Bravais lattice, Miller‟s indices, Crystal planes" into "Moore‟s law", "CMOS scaling", "Overview of key semiconductor technologies", "Crystal Structure: Bravais lattice", "Miller‟s indices", "Crystal planes" (first keeps id moore-s-law-cmos-scaling-overview-of-key-semiconductor)
- sem 7: Split topic "Crystal defects - point defects, Linear defects, and volume defects" into "Crystal defects", "point defects", "Linear defects", "volume defects" (first keeps id crystal-defects-point-defects-linear-defects-and-volume)
- sem 7: Split topic "Raw materials and purification, Crystal growth: Czochralski and Float-Zone processes, Silicon wafers, their specifications and measurements" into "Raw materials and purification", "Crystal growth: Czochralski and Float-Zone processes", "Silicon wafers", "their specifications and measurements" (first keeps id raw-materials-and-purification-crystal-growth-czochralski)
- sem 7: Split topic "Contamination Control: Cleanrooms - features, classifications and guidelines" into "Contamination Control: Cleanrooms, features", "classifications and guidelines" (first keeps id contamination-control-cleanrooms-features-classifications)
- sem 7: Split topic "Photolithography: introduction and its application to IC manufacturing, Light sources, Photomask, Wafer exposure system: contact proximity and projection printing, Immersion lithography, Resolution an" into "Photolithography: introduction and its application to IC manufacturing", "Light sources, Photomask", "Wafer exposure system: contact proximity and projection printing", "Immersion lithography" (first keeps id photolithography-introduction-and-its-application-to-ic)
- sem 7: Split topic "Oxidation: Dry vs wet oxidation, LOCOS, Thermal oxidation furnaces: Horizontal vs. vertical - their mechanism, Si/SiO2 interface, Oxide growth charges" into "Oxidation: Dry vs wet oxidation", "LOCOS", "Thermal oxidation furnaces: Horizontal vs. vertical, their mechanism", "Si/SiO2 interface", "Oxide growth charges" (first keeps id oxidation-dry-vs-wet-oxidation-locos-thermal-oxidation)
- sem 7: Split topic "growth kinetics, Deal-Grove model, Physical measurement: ellipsometry, measurement by CV method" into "growth kinetics", "Deal-Grove model", "Physical measurement: ellipsometry", "measurement by CV method" (first keeps id growth-kinetics-deal-grove-model-physical-measurement)
- sem 7: Split topic "Doping process: doping profile of PN-junction, Trends in diffusion, Solid solubility, Fick‟s second law and its analytical solution, Gaussian solutions, Diffusion furnaces - horizontal vs. vertical" into "Doping process: doping profile of PN-junction", "Trends in diffusion", "Solid solubility", "Fick‟s second law and its analytical solution", "Gaussian solutions", "Diffusion furnaces", "horizontal vs. vertical" (first keeps id pn-junction-physics)
- sem 7: Split topic "Ion implantation process: Dose, Energy and Angle considerations, Implantation damage and annealing - RTA, Channeling and shadowing effect, Diffusion vs. ion-implantation and their applications" into "Ion implantation process: Dose", "Energy and Angle considerations", "Implantation damage and annealing", "RTA", "Channeling and shadowing effect", "Diffusion vs. ion-implantation and their applications" (first keeps id ion-implantation-process-dose-energy-and-angle)
- sem 7: Split topic "Thin film deposition: requirements, characteristics and step coverage" into "Thin film deposition: requirements", "characteristics and step coverage" (first keeps id thin-film-deposition-requirements-characteristics-and-step)
- sem 7: Split topic "PVD techniques: thermal and e-beam, Sputtering: types - DC and RF sputtering, process parameters and applications" into "PVD techniques: thermal and e-beam", "Sputtering: types", "DC and RF sputtering", "process parameters and applications" (first keeps id pvd-techniques-thermal-and-e-beam-sputtering-types-dc-and-rf)
- sem 7: Split topic "CVD techniques and types: APCVD, LPCVD, PECVD, MOCVD" into "CVD techniques and types: APCVD", "LPCVD", "PECVD", "MOCVD" (first keeps id cvd-techniques-and-types-apcvd-lpcvd-pecvd-mocvd)
- sem 7: Split topic "Etching: types - wet and dry etch, anisotropic and isotropic, selectivity, plasma etching and RIE" into "Etching: types", "wet and dry etch", "anisotropic and isotropic, selectivity", "plasma etching and RIE" (first keeps id etching-types-wet-and-dry-etch-anisotropic-and-isotropic)
- sem 7: Split topic "Wafer testing and sorting: Probe card setup, Electrical testing, Test data collection, Yield analysis, Defect mapping and diagnosis, Die sorting" into "Wafer testing and sorting: Probe card setup", "Electrical testing", "Test data collection", "Yield analysis", "Defect mapping and diagnosis", "Die sorting" (first keeps id wafer-testing-and-sorting-probe-card-setup-electrical)
- sem 7: Split topic "Back-end technology: Interconnects in CMOS technology, Metallic interconnects, Copper interconnects" into "Back-end technology: Interconnects in CMOS technology", "Metallic interconnects" (first keeps id back-end-technology-interconnects-in-cmos-technology)
- sem 7: Split topic "Advantages, Challenges posed, Interconnect fabrication process" into "Challenges posed", "Interconnect fabrication process" (first keeps id advantages-challenges-posed-interconnect-fabrication-process)
- sem 7: Split topic "Packaging assembly technology: Wafer thinning, Dicing, Die-attach, Wire-bond & Flip-chip process, Encapsulation, Laser marking, Solder ball attach, Singulation" into "Packaging assembly technology: Wafer thinning, Dicing", "Die-attach", "Wire-bond & Flip-chip process", "Encapsulation", "Laser marking", "Solder ball attach, Singulation" (first keeps id packaging-assembly-technology-wafer-thinning-dicing-die)
- sem 7: Split topic "Overview of drone technology: history, evolution, and current trends" into "Overview of drone technology: history, evolution", "current trends" (first keeps id overview-of-drone-technology-history-evolution-and-current)
- sem 7: Split topic "Regulations in drone operations. Safety measures and best practices for drone operation" into "Regulations in drone operations", "Safety measures and best practices for drone operation" (first keeps id regulations-in-drone-operations-safety-measures-and-best)
- sem 7: Split topic "Introduction to Radar: Basic Radar" into "Introduction to Radar: Basic Radar", "Applications of Radar" (first keeps id introduction-to-radar-basic-radar)
- sem 7: Split topic "Radar types: MTI, Doppler and Pulse, PRF, Delay, Line Cancellers, Staggered Pulse Repetition Frequencies, Doppler Filter Banks, Digital MTI Processing, Moving Target Detector, Limitations to MTI Perfo" into "Doppler and Pulse", "PRF, Delay", "Line Cancellers", "Staggered Pulse Repetition Frequencies", "Doppler Filter Banks", "Digital MTI Processing", "Moving Target Detector" (first keeps id radar-types-mti-doppler-and-pulse-prf-delay-line-cancellers)
- sem 7: Split topic "Tracking with Radar-Monopulse Tracking, Conical Scan and Sequential Lobing, Limitations to Tracking Accuracy, Low-Angle Tracking" into "Conical Scan and Sequential Lobing", "Limitations to Tracking Accuracy", "Low-Angle Tracking" (first keeps id tracking-with-radar-monopulse-tracking-conical-scan-and)
- sem 7: Split topic "Tracking in Range, Comparison of Trackers, Automatic Tracking with Surveillance Radars" into "Tracking in Range", "Comparison of Trackers", "Automatic Tracking with Surveillance Radars" (first keeps id tracking-in-range-comparison-of-trackers-automatic-tracking)
- sem 7: Split topic "Radar Displays. Matched Filter Receiver" into "Radar Displays", "Matched Filter Receiver" (first keeps id radar-displays-matched-filter-receiver)
- sem 7: Split topic "Detection of Signals in Noise –Detection of Signals in Noise, Receiver Noise and the Signal-to-Noise Ratio, Probability Density Functions, Probabilities of Detection and False Alarm, Integration of Ra" into "Detection of Signals in Noise –Detection of Signals in Noise", "Receiver Noise and the Signal-to-Noise Ratio", "Probability Density Functions", "Probabilities of Detection and False Alarm" (first keeps id detection-of-signals-in-noise-detection-of-signals-in-noise)
- sem 7: Split topic "Cloud Computing, and Embedded Systems" into "Cloud Computing", "Embedded Systems" (first keeps id cloud-computing-and-embedded-systems)
- sem 7: Split topic "Over sampling ADC – Noise shaping" into "Over sampling ADC", "Noise shaping" (first keeps id over-sampling-adc-noise-shaping)
- sem 7: Split topic "Introduction to Deep Learning (DL) Techniques, Convolutional Neural Networks (CNN), Basic architecture, Convolutional Layers, Pooling Layers, Activation functions, Handling vanishing gradient problem," into "Introduction to Deep Learning (DL) Techniques", "Convolutional Neural Networks (CNN)", "Basic architecture", "Convolutional Layers", "Pooling Layers", "Activation functions" (first keeps id cnn)
- sem 7: Split topic "Different CNN Models: LeNet, AlexNet, VGGNet, GoogleNet, ResNet, DenseNet, Training of Deep neural Networks, Hyper parameter tuning, transfer learning, Dataset augmentation" into "Different CNN Models: LeNet, AlexNet, VGGNet, GoogleNet, ResNet, DenseNet", "Training of Deep neural Networks", "Hyper parameter tuning", "transfer learning", "Dataset augmentation" (first keeps id different-cnn-models-lenet-alexnet-vggnet-googlenet-resnet)

</details>

<details><summary>extra item not in any handout (15)</summary>

- sem 4: Retire topic "Frequency- Domain representation" in chapter "Amplitude Modulation"
- sem 4: Retire topic "Pre- envelope" in chapter "Amplitude Modulation"
- sem 4: Retire topic "Pre-emphasis and De- emphasis in FM" in chapter "Noise in Analog Communication Systems"
- sem 4: Retire topic "Co- axial and Spherical capacitors" in chapter "Electrostatics"
- sem 4: Retire topic "Total Internal Reflection" in chapter "EM Wave Characteristics"
- sem 4: Retire topic "λ/4" in chapter "Transmission Lines"
- sem 4: Retire topic "λ/2 and λ/8 Lines- Impedance Transformations" in chapter "Transmission Lines"
- sem 6: Retire topic "drones and Multi- agent systems" in chapter "Modern Controllers and Estimators"
- sem 7: Retire topic "Note: The detailed syllabus page for this course prints L-T-P-C as 3-0-0-0" in chapter "Datapath and array subsystem design"
- sem 7: Retire topic "the credits shown here follow the official course structure table" in chapter "Datapath and array subsystem design"
- sem 7: Retire topic "Max" in chapter "Introduction to 6g"
- sem 7: Retire topic "Hrs.: 42" in chapter "Introduction to 6g"
- sem 7: Retire topic "Max Hrs.:" in chapter "Etching and Back-end Technology"
- sem 7: Retire topic "hybrid. Components of a drone: frame" in chapter "INTRODUCTION TO DRONES and ITS MECHATRONIC COMPONENTS"
- sem 7: Retire topic "Frequency- Scan Arrays" in chapter "Radar Receivers"

</details>

### elec

<details><summary>new course (38)</summary>

- sem 1: Add course "Elements of Electrical Engineering" (20EE101T, 4 units): same name as pdeu-elements-of-electrical-engg, but only 51% of its topics are in it
- sem 3: Add course "Mathematics - III" (20MA203T, 4 units): same name as pdeu-mathematics-3-civil, but only 41% of its topics are in it
- sem 3: Add course "Network Analysis" (20EE201T, 4 units)
- sem 3: Add course "Analog & Digital Electronics" (20EE202T, 4 units)
- sem 3: Add course "Transformers & Induction Machines" (20EE203T, 4 units)
- sem 3: Add course "Climate Change: Impact and Solutions" (20EE204T, 4 units)
- sem 4: Add course "Electrical Power Generation, Transmission and Distribution" (20EE205T, 4 units)
- sem 4: Add course "Linear Control Theory" (20EE206T, 4 units)
- sem 4: Add course "Synchronous and DC Machines" (20EE207T, 4 units)
- sem 4: Add course "Microprocessors and Microcontrollers" (20EE208T, 4 units)
- sem 4: Add course "Industry 4.0" (20IF201T, 4 units): same name as pdeu-industry-4-0-department-specific-ce, but only 39% of its topics are in it
- sem 4: Add course "Energy and Water Nexus" (20EE209T, 4 units)
- sem 5: Add course "Power System Operations and Control" (20EE301T, 4 units)
- sem 5: Add course "Power Electronic Converters" (20EE302T, 4 units)
- sem 5: Add course "Instrumentation and Control" (20EE303T, 4 units)
- sem 5: Add course "High Voltage Engineering" (20EE304T, 4 units)
- sem 5: Add course "Digital Signal Processing" (20EE305T, 4 units): same name as pdeu-digital-signal-processing-ece, but only 27% of its topics are in it
- sem 5: Add course "Analog and Digital Communication" (20EE306T, 4 units)
- sem 5: Add course "Artificial Intelligence in Electrical Systems" (20EE307T, 4 units)
- sem 5: Add course "Energy Management and Audit" (20EE308T, 4 units)
- sem 5: Add course "Systems Thinking" (20EE309T, 4 units)
- sem 5: Add course "Wind and Solar Energy" (20EE310T, 4 units)
- sem 6: Add course "Power System Protection" (20EE311T, 4 units)
- sem 6: Add course "Electric Drives" (20EE312T, 4 units)
- sem 6: Add course "Renewable Energy Engineering" (20EE313T, 4 units)
- sem 6: Add course "Advanced Power Electronic Converters" (20EE314T, 4 units)
- sem 6: Add course "Advanced Power System Analysis" (20EE315T, 4 units)
- sem 6: Add course "Embedded Systems" (20EE316T, 4 units): same name as pdeu-embedded-systems, but only 27% of its topics are in it
- sem 6: Add course "Electric Vehicles" (20EE317T, 4 units)
- sem 6: Add course "Net Zero Energy Buildings" (20EE318T, 5 units)
- sem 7: Add course "Electrical Machine Design" (20EE401T, 4 units)
- sem 7: Add course "Smart Grid: Technologies and Applications" (20EE402T, 4 units)
- sem 7: Add course "Electricity Sector in India: Policies and Regulations" (21EE403T, 4 units)
- sem 7: Add course "FACTS and HVDC Power Transmission" (20EE404T, 4 units)
- sem 7: Add course "Digital Control" (20EE405T, 4 units)
- sem 7: Add course "Power Quality" (20EE406T, 4 units)
- sem 7: Add course "Modelling and Analysis of Electrical Machines" (20EE407T, 4 units)
- sem 7: Add course "Electric Vehicle Technologies" (20EE408T, 4 units)

</details>

<details><summary>new practical course (27)</summary>

- sem 1: Add lab "Elements of Electrical Engineering Laboratory" (15 experiments), related to Elements of Electrical Engineering
- sem 3: Add lab "Analog & Digital Electronics – Lab." (20 experiments), related to Analog & Digital Electronics
- sem 3: Add lab "Transformers & Induction Machines – Lab." (18 experiments), related to Transformers & Induction Machines
- sem 3: Add lab "Communication Skills – II" (4 experiments)
- sem 4: Add lab "Control Systems Laboratory" (12 experiments)
- sem 4: Add lab "Synchronous and DC Machines Laboratory" (16 experiments), related to Synchronous and DC Machines
- sem 4: Add lab "Microprocessors and Microcontrollers Laboratory" (18 experiments), related to Microprocessors and Microcontrollers
- sem 4: Add lab "Industry 4.0 Laboratory" (10 experiments), related to Industry 4.0
- sem 5: Add lab "Power System Simulation Laboratory" (14 experiments)
- sem 5: Add lab "Power Electronic Converters Laboratory" (15 experiments), related to Power Electronic Converters
- sem 5: Add lab "Instrumentation and Control Laboratory" (13 experiments), related to Instrumentation and Control
- sem 5: Add lab "High Voltage Engineering Laboratory" (12 experiments), related to High Voltage Engineering
- sem 5: Add lab "Digital Signal Processing Laboratory" (16 experiments), related to Digital Signal Processing
- sem 5: Add lab "Analog and Digital Communication Laboratory" (14 experiments), related to Analog and Digital Communication
- sem 5: Add lab "Artificial Intelligence in Electrical Systems Laboratory" (10 experiments), related to Artificial Intelligence in Electrical Systems
- sem 5: Add lab "Communication Skills – III" (3 experiments)
- sem 6: Add lab "Power System Protection Laboratory" (18 experiments), related to Power System Protection
- sem 6: Add lab "Electric Drives Laboratory" (14 experiments), related to Electric Drives
- sem 6: Add lab "Renewable Energy Engineering Laboratory" (17 experiments), related to Renewable Energy Engineering
- sem 6: Add lab "Advanced Power Electronic Converters Laboratory" (15 experiments), related to Advanced Power Electronic Converters
- sem 6: Add lab "Advanced Power System Analysis Laboratory" (10 experiments), related to Advanced Power System Analysis
- sem 6: Add lab "Embedded System Laboratory" (11 experiments)
- sem 7: Add lab "FACTS and HVDC Power Transmission Laboratory" (13 experiments), related to FACTS and HVDC Power Transmission
- sem 7: Add lab "Digital Control Laboratory" (12 experiments), related to Digital Control
- sem 7: Add lab "Power Quality Laboratory" (11 experiments), related to Power Quality
- sem 7: Add lab "Modelling and Analysis of Electrical Machines Laboratory" (12 experiments), related to Modelling and Analysis of Electrical Machines
- sem 7: Add lab "Electric Vehicles Laboratory" (0 experiments)

</details>

### ict

<details><summary>new practical course (16)</summary>

- sem 1: Add lab "Computer Programming – I Laboratory" (10 experiments), related to Computer Programming-I
- sem 2: Add lab "Computer Programming-II Laboratory" (10 experiments), related to Computer Programming-II
- sem 2: Add lab "Elements of Electrical and Electronics Engineering Laboratory" (13 experiments), related to Elements of Electrical and Electronics Engineering
- sem 3: Add lab "Digital Circuits Lab" (10 experiments), related to Digital Circuits
- sem 3: Add lab "Data Structures and Algorithms Laboratory" (10 experiments), related to Data Structures and Algorithms
- sem 4: Add lab "Database Management Systems Laboratory" (10 experiments), related to Database Management Systems
- sem 4: Add lab "Principles of Programming Languages Laboratory" (10 experiments), related to Principles of Programming Languages
- sem 4: Add lab "Computer Organization and Microprocessor Lab" (12 experiments), related to Computer Organization and Microprocessor
- sem 5: Add lab "Theory of Computation and Compiler Design Laboratory" (0 experiments), related to Theory of Computation and Compiler Design
- sem 5: Add lab "Digital Signal Processing Lab" (6 experiments), related to Digital Signal Processing
- sem 5: Add lab "RF Engineering Lab" (11 experiments), related to RF Engineering
- sem 6: Add lab "Digital Communication Lab" (9 experiments), related to Digital Communication
- sem 6: Add lab "Computer Communication and Networking Lab" (12 experiments), related to Computer Communication and Networking
- sem 7: Add lab "Software Engineering Methodologies Laboratory" (10 experiments), related to Software Engineering Methodologies
- sem 7: Add lab "Embedded Systems Lab" (9 experiments), related to Embedded Systems
- sem 7: Add lab "Digital CMOS and VLSI Design Lab" (10 experiments), related to Digital CMOS and VLSI Design

</details>

<details><summary>unit missing (1)</summary>

- sem 7: Add unit 1 "Introduction to Wireless Communications" (4 topics) to pdeu-modern-wireless-communications-communication-and

</details>

<details><summary>topic missing (22)</summary>

- sem 2: Add topic "Operation of transformer on noload and load" to chapter "Introduction to Electrical Machines and Electrical Installation" [course shared with ece, civil]
- sem 2: Add topic "types of 3-phase induction motors" to chapter "Introduction to Electrical Machines and Electrical Installation" [course shared with ece, civil]
- sem 2: Add topic "production of rotating magnetic field, operation" to chapter "Introduction to Electrical Machines and Electrical Installation" [course shared with ece, civil]
- sem 2: Add topic "starting and running torques" to chapter "Introduction to Electrical Machines and Electrical Installation" [course shared with ece, civil]
- sem 2: Add topic "Torque-slip characteristics" to chapter "Introduction to Electrical Machines and Electrical Installation" [course shared with ece, civil]
- sem 2: Add topic "Power Stages in an induction motor" to chapter "Introduction to Electrical Machines and Electrical Installation" [course shared with ece, civil]
- sem 4: Add topic "Conceptual data modeling, motivation, entities" to chapter "Conceptual Modeling Introduction"
- sem 4: Add topic "entity types" to chapter "Conceptual Modeling Introduction"
- sem 4: Add topic "various types of attributes, relationships" to chapter "Conceptual Modeling Introduction"
- sem 4: Add topic "relationship types" to chapter "Conceptual Modeling Introduction"
- sem 4: Add topic "E/R diagram notation, examples" to chapter "Conceptual Modeling Introduction"
- sem 5: Add topic "React Hooks, useEffect, useReducer, useContext, useCallback" to chapter "Front-end Web Development with React.js"
- sem 5: Add topic "fetching data with React Hooks" to chapter "Front-end Web Development with React.js"
- sem 5: Add topic "JSX, Props" to chapter "Front-end Web Development with React.js"
- sem 5: Add topic "Methods as props" to chapter "Front-end Web Development with React.js"
- sem 5: Add topic "State and setState" to chapter "Front-end Web Development with React.js"
- sem 5: Add topic "Destructuring props and state" to chapter "Front-end Web Development with React.js"
- sem 6: Add topic "Case study: Current Trends and Future of Machine Learning Total" to chapter "Various applications of Machine learning"
- sem 6: Add topic "Heroku Total" to chapter "Deployment of MERN Stack Web Applications"
- sem 7: Add topic "software reengineering" to chapter "Software Reliability and Software Maintenance"
- sem 7: Add topic "software reuse" to chapter "Software Reliability and Software Maintenance"
- sem 7: Add topic "pin diagram and basic connections, clock, reset" to chapter "Embedded Systems – Introduction and Architecture"

</details>

<details><summary>topic split (131)</summary>

- sem 1: Split topic "go to statement. Loop control structures- while" into "go to statement", "Loop control structures- while" (first keeps id go-to-statement-loop-control-structures-while)
- sem 1: Split topic "Array Manipulations. Matrix operations" into "Array Manipulations", "Matrix operations" (first keeps id array-manipulations-matrix-operations)
- sem 1: Split topic "Pointer" into "Pointer arithmetic", "Pointer to pointer" (first keeps id pointer)
- sem 1: Split topic "File handling in C" into "File handling in C", "File handling functions" (first keeps id file-handling-in-c)
- sem 2: Split topic "Comparison with other programming languages. Python IDEs Tokens: Identifiers" into "Comparison with other programming languages", "Python IDEs Tokens: Identifiers" (first keeps id comparison-with-other-programming-languages-python-ides)
- sem 2: Split topic "elif and else" into "elif and else, nesting", "for else and while else" (first keeps id elif-and-else)
- sem 2: Split topic "Decorator function" into "Decorator function", "Decorator chaining Generator function" (first keeps id decorator-function)
- sem 2: Split topic "instantaneous power" into "instantaneous power", "average power and reactive power" (first keeps id instantaneous-power) [course shared with ece, civil]
- sem 2: Split topic "polyphase circuits" into "polyphase circuits", "power measurement in polyphase circuits" (first keeps id polyphase-circuits) [course shared with ece, civil]
- sem 2: Split topic "Magnetic materials and its B-H characteristic, Faraday’s Law of Electromagnetic Induction" into "Magnetic materials and its B-H characteristic", "Faraday’s Law of Electromagnetic Induction" (first keeps id faradays-law) [course shared with ece, civil]
- sem 2: Split topic "Components of LT Switchgear: Switch Fuse Unit (SFU), MCB, ELCB, MCCB, Types of Wires and Cables, Earthing, Types of Batteries, Important Characteristics for Batteries" into "Components of LT Switchgear: Switch Fuse Unit (SFU)", "MCB", "ELCB", "MCCB", "Types of Wires and Cables, Earthing", "Types of Batteries", "Important Characteristics for Batteries" (first keeps id lt-switchgear) [course shared with ece, civil]
- sem 2: Split topic "Elementary calculations for energy consumption, Electrical safety rules" into "Elementary calculations for energy consumption", "Electrical safety rules" (first keeps id elementary-calculations-for-energy-consumption-electrical) [course shared with ece, civil]
- sem 2: Split topic "Semiconductor Diodes and Applications, Diode as a Switch, Diode as a Rectifier, Half Wave and Full Wave Rectifiers with and without Filters" into "Semiconductor Diodes and Applications", "Diode as a Switch", "Diode as a Rectifier", "Half Wave and Full Wave Rectifiers with and without Filters" (first keeps id rectifiers) [course shared with ece, civil]
- sem 2: Split topic "Breakdown Mechanisms, Zener Diode – Operation and Applications" into "Breakdown Mechanisms", "Zener Diode", "Operation and Applications" (first keeps id breakdown-mechanisms-zener-diode-operation-and-applications) [course shared with ece, civil]
- sem 2: Split topic "Opto-Electronic Devices–LEDs, Photo Diode and Applications" into "Opto-Electronic Devices–LEDs", "Photo Diode and Applications" (first keeps id opto-electronic-devices-leds-photo-diode-and-applications) [course shared with ece, civil]
- sem 2: Split topic "Transistor Characteristics covering, Bipolar Junction Transistor (BJT)" into "Transistor Characteristics covering", "Bipolar Junction Transistor (BJT)" (first keeps id pn-junction-physics) [course shared with ece, civil]
- sem 2: Split topic "Construction, Operation, Amplifying Action, Common Base, Common Emitter and Common Collector Configurations, Field Effect Transistor (FET)" into "Amplifying Action", "Common Base", "Common Emitter and Common Collector Configurations", "Field Effect Transistor (FET)" (first keeps id construction-operation-amplifying-action-common-base-common) [course shared with ece, civil]
- sem 3: Split topic "signed/unsigned binary, octal and hexadecimal arithmetic" into "signed/unsigned binary", "octal and hexadecimal arithmetic" (first keeps id signed-unsigned-binary-octal-and-hexadecimal-arithmetic)
- sem 3: Split topic "Excess-3 codes, Logic Gates, and Truth Table" into "Excess-3 codes", "Logic Gates", "Truth Table" (first keeps id excess-3-codes-logic-gates-and-truth-table)
- sem 3: Split topic "Error detection and correction codes - parity check codes and Hamming codes" into "Error detection and correction codes", "parity check codes and Hamming codes" (first keeps id error-detection-and-correction-codes-parity-check-codes-and)
- sem 3: Split topic "Arithmetic modules- ripple carry adder, subtractor, carry look ahead adder" into "Arithmetic modules- ripple carry adder, subtractor", "carry look ahead adder" (first keeps id arithmetic-modules-ripple-carry-adder-subtractor-carry-look)
- sem 3: Split topic "basic multiplier, BCD Adder" into "basic multiplier", "BCD Adder" (first keeps id basic-multiplier-bcd-adder)
- sem 3: Split topic "Latches and flip-flops: SR-latch" into "Latches and flip-flops: SR-latch, D-latch", "JK flip-flops and T flip-flops" (first keeps id latches-and-flip-flops-sr-latch)
- sem 3: Split topic "D flip-flop" into "D flip-flop", "JK flip-flop", "T flip-flop" (first keeps id d-flip-flop)
- sem 3: Split topic "Moore and Mealy Finite State Machines (FSM): state diagram, state table, state assignment" into "Moore and Mealy Finite State Machines (FSM): state diagram", "state table", "state assignment" (first keeps id finite-state-machines)
- sem 3: Split topic "Implementation of FSM using Decoders, OR gates, Multiplexors and ROM. Various Registers and counters: asynchronous counters, synchronous counters" into "Implementation of FSM using Decoders, gates", "Multiplexors and ROM", "Various Registers and counters: asynchronous counters", "synchronous counters" (first keeps id implementation-of-fsm-using-decoders-or-gates-multiplexors)
- sem 3: Split topic "ring counter, Johnson counter" into "ring counter", "Johnson counter" (first keeps id ring-counter-johnson-counter)
- sem 3: Split topic "programmable logic array" into "programmable logic array", "programmable array logic" (first keeps id programmable-logic-array)
- sem 3: Split topic "Polish Expression" into "Polish Expression", "Reverse Polish Expression, Their Compilation" (first keeps id polish-expression)
- sem 3: Split topic "Priority Queue" into "Priority Queue", "Array Representation of Priority Queue" (first keeps id priority-queue)
- sem 3: Split topic "Trees: Basic Tree Terminologies, Different types of Trees: Binary Tree, Threaded Binary Tree, Binary Search Tree, AVL Tree" into "Trees: Basic Tree Terminologies", "Different types of Trees: Binary Tree", "Threaded Binary Tree", "Binary Search Tree", "AVL Tree" (first keeps id binary-search-tree)
- sem 3: Split topic "Tree operations on each of the trees and their algorithms with complexity analysis" into "Tree operations on each of the trees and their algorithms with complexity analysis", "algorithms and analysis" (first keeps id tree-operations-on-each-of-the-trees-and-their-algorithms)
- sem 3: Split topic "Graph: Basic Terminologies and Representations, Graph search and traversal algorithms and complexity analysis" into "Graph: Basic Terminologies and Representations", "Graph search and traversal algorithms and complexity analysis" (first keeps id graph-basic-terminologies-and-representations-graph-search)
- sem 3: Split topic "Overview of ICT: Evolution and Trends in ICT, ICT Infrastructure and Components, Role of ICT in Modern Society, and Industry" into "Overview of ICT: Evolution and Trends in ICT", "ICT Infrastructure and Components", "Role of ICT in Modern Society, Industry" (first keeps id overview-of-ict-evolution-and-trends-in-ict-ict)
- sem 3: Split topic "Type of ICT Services: Software Development, Computer Networking, Telecommunication, Cybersecurity, Data Analytics, Cloud Computing" into "Type of ICT Services: Software Development", "Computer Networking, Telecommunication, Cybersecurity", "Data Analytics", "Cloud Computing" (first keeps id type-of-ict-services-software-development-computer)
- sem 3: Split topic "Hardware Technologies: Data Processing Hardware, Data Input Hardware, Data Output Hardware, Data Transmission Hardware, Data Storage Hardware" into "Hardware Technologies: Data Processing Hardware", "Data Input Hardware", "Data Output Hardware", "Data Transmission Hardware", "Data Storage Hardware" (first keeps id hardware-technologies-data-processing-hardware-data-input)
- sem 3: Split topic "Software Technologies: Firmware, Operating Systems, IT Protocols, Programming Languages, Software Development Methodologies" into "Software Technologies: Firmware", "Operating Systems", "IT Protocols", "Programming Languages", "Software Development Methodologies" (first keeps id software-technologies-firmware-operating-systems-it)
- sem 3: Split topic "data management" into "data management techniques", "data management" (first keeps id data-management)
- sem 3: Split topic "biasing techniques. Transistor as an amplifier" into "biasing techniques", "Transistor as an amplifier" (first keeps id biasing-techniques-transistor-as-an-amplifier)
- sem 3: Split topic "bandwidth and frequency response. Frequency response of multistage amplifiers" into "bandwidth and frequency response", "Frequency response of multistage amplifiers" (first keeps id bandwidth-and-frequency-response-frequency-response-of)
- sem 3: Split topic "scaling & averaging amplifiers. Linear Applications: Instrumentation Amplifiers" into "scaling & averaging amplifiers", "Linear Applications: Instrumentation Amplifiers" (first keeps id scaling-and-averaging-amplifiers-linear-applications)
- sem 3: Split topic "Sample and Hold circuits. Waveform Generators: Sine" into "Sample and Hold circuits", "Waveform Generators: Sine" (first keeps id sample-and-hold-circuits-waveform-generators-sine)
- sem 4: Split topic "Database - DBMS distinction, approaches to building a database, data models, database management system, three-schema architecture of a database, challenges in building a DBMS, various components of a" into "DBMS distinction", "approaches to building a database", "data models", "database management system", "three-schema architecture of a database", "challenges in building a DBMS", "various components of a DBMS.E/R Model" (first keeps id er-model)
- sem 4: Split topic "Relational Data Model - Concept of relations, schema-instance distinction, keys, referential integrity, and foreign keys" into "Relational Data Model", "Concept of relations", "schema-instance distinction, keys", "referential integrity", "foreign keys" (first keeps id relational-data-model-concept-of-relations-schema-instance)
- sem 4: Split topic "dependency theory - functional dependencies" into "dependency theory", "functional dependencies" (first keeps id dependency-theory-functional-dependencies)
- sem 4: Split topic "3NF and BCNF" into "3NF and BCNF", "algorithms for 3NF and BCNF normalization" (first keeps id 3nf-and-bcnf)
- sem 4: Split topic "deadlock handling. Recovery: Failure classification" into "deadlock handling", "Recovery: Failure classification" (first keeps id deadlock-handling-recovery-failure-classification)
- sem 4: Split topic "programming language processing. Data types: primitive data types" into "programming language processing", "Data types: primitive data types" (first keeps id programming-language-processing-data-types-primitive-data)
- sem 4: Split topic "implementation and storage representation of data types. Type binding" into "implementation and storage representation of data types", "Type binding" (first keeps id implementation-and-storage-representation-of-data-types-type)
- sem 4: Split topic "object oriented as abstract data type. Data abstraction" into "object oriented as abstract data type", "Data abstraction" (first keeps id object-oriented-as-abstract-data-type-data-abstraction)
- sem 4: Split topic "run time type identification. Dynamic Memory Management" into "run time type identification", "Dynamic Memory Management" (first keeps id run-time-type-identification-dynamic-memory-management)
- sem 4: Split topic "recursive sub-program. Referencing environment" into "recursive sub-program", "Referencing environment" (first keeps id recursive-sub-program-referencing-environment)
- sem 4: Split topic "lambda calculus" into "lambda calculus, ambiguity", "typed lambda calculus" (first keeps id lambda-calculus)
- sem 4: Split topic "application of functional programming. Functional Programming with python" into "application of functional programming", "Functional Programming with python" (first keeps id application-of-functional-programming-functional-programming)
- sem 4: Split topic "Definition, Classification, Continuous time LTI systems: Convolution integral and unit impulse response, Interconnections, stability and causality" into "Continuous time LTI systems: Convolution integral and unit impulse response, Interconnections", "stability and causality" (first keeps id convolution)
- sem 4: Split topic "AM Schemes: modulation and detection – DSBFC" into "AM Schemes: modulation and detection", "DSBFC" (first keeps id am-schemes-modulation-and-detection-dsbfc)
- sem 4: Split topic "Noise types" into "Noise types", "Noise factor and Noise figure" (first keeps id noise-types)
- sem 4: Split topic "Moore and Mealy machines. Basic architecture of micro-computer and Central processing unit" into "Moore and Mealy machines", "Basic architecture of micro-computer and Central processing unit" (first keeps id moore-and-mealy-machines-basic-architecture-of-micro)
- sem 4: Split topic "design of Basic central processing unit. Hardwired and microprogramed control Units" into "design of Basic central processing unit", "Hardwired and microprogramed control Units" (first keeps id hardwired-control)
- sem 4: Split topic "arithmetic and instruction pipeline. Memory organization" into "arithmetic and instruction pipeline", "Memory organization" (first keeps id arithmetic-and-instruction-pipeline-memory-organization)
- sem 4: Split topic "Pin diagram, signals, and register set of 8086. Addressing modes" into "Pin diagram, signals", "register set of 8086", "Addressing modes" (first keeps id pin-diagram-signals-and-register-set-of-8086-addressing)
- sem 4: Split topic "interfacing PPI 8255, and Interrupt controller 8259" into "interfacing PPI 8255", "Interrupt controller 8259" (first keeps id interfacing-ppi-8255-and-interrupt-controller-8259)
- sem 5: Split topic "Fundamentals of formal languages, grammars, and computation models" into "Fundamentals of formal languages, grammars", "computation models" (first keeps id fundamentals-of-formal-languages-grammars-and-computation)
- sem 5: Split topic "IIR Filter Design" into "IIR Filter Design", "IIR Filter Coefficients from Analog Filter" (first keeps id iir-filter-design)
- sem 5: Split topic "The Time-Dependent Fourier Transform" into "The Time-Dependent Fourier Transform", "Block Convolution using the Time Dependent Fourier Transform" (first keeps id the-time-dependent-fourier-transform)
- sem 5: Split topic "Application of DFT in Linear Filtering, Fourier Analysis of Nonstationary Signals" into "Application of DFT in Linear Filtering", "Fourier Analysis of Nonstationary Signals" (first keeps id application-of-dft-in-linear-filtering-fourier-analysis-of)
- sem 5: Split topic "Fourier Analysis of Stationary Random Signals: The Periodogram, Fourier Transform for Causal Sequences" into "Fourier Analysis of Stationary Random Signals: The Periodogram", "Fourier Transform for Causal Sequences" (first keeps id fourier-analysis-of-stationary-random-signals-the)
- sem 5: Split topic "Fundamental Parameters related to antenna (Radiation Pattern, Radiation Power Density, Directivity, Gain, Beam width, Bandwidth, Polarization, Radiation Efficiency, Antenna Efficiency, Far Field Radia" into "Fundamental Parameters related to antenna (Radiation Pattern", "Radiation Power Density, Directivity, Gain", "Beam width, Bandwidth, Polarization", "Radiation Efficiency", "Antenna Efficiency", "Far Field Radiation" (first keeps id antenna-parameters)
- sem 5: Split topic "Antenna Array: Two Element Array N-Element Linear Array with uniform amplitude and spacing, Broadside and End-Fire Arrays, N-Element 2D Array" into "Antenna Array: Two Element Array N-Element Linear Array with uniform amplitude and spacing", "Broadside and End-Fire Arrays", "N-Element 2D Array" (first keeps id antenna-array-two-element-array-n-element-linear-array-with)
- sem 5: Split topic "Microstrip antenna: Introduction to strip line and microstrip lines, Advantages and limitations, feeding techniques, introduction to rectangular microstrip antenna, RMSA and CMSA design, filters desig" into "Microstrip antenna: Introduction to strip line and microstrip lines", "Advantages and limitations", "feeding techniques", "introduction to rectangular microstrip antenna", "RMSA and CMSA design", "filters design using microstrip line" (first keeps id microstrip-antenna-introduction-to-strip-line-and-microstrip)
- sem 5: Split topic "radar resolution. Modes of wave propagation" into "radar resolution", "Modes of wave propagation" (first keeps id radar-resolution-modes-of-wave-propagation)
- sem 5: Split topic "JavaScript and objects" into "JavaScript and objects", "JavaScript own objects", "JavaScript Objects" (first keeps id javascript-and-objects)
- sem 5: Split topic "Introduction to Frontend web development, Single page web applications, Fundamentals of React.js, Components: Class Components and Functional Components, React Hooks - useEffect, useReducer, useContex" into "Introduction to Frontend web development", "Single page web applications", "Fundamentals of React.js", "Components: Class Components and Functional Components" (first keeps id introduction-to-frontend-web-development-single-page-web)
- sem 5: Split topic "variables in interface and extending interfaces. Packages: Creating a Package" into "variables in interface and extending interfaces", "Packages: Creating a Package" (first keeps id variables-in-interface-and-extending-interfaces-packages)
- sem 5: Split topic "importing packages. Exception Handling: Concepts of Exception handling" into "importing packages", "Exception Handling: Concepts of Exception handling" (first keeps id exceptions-oop)
- sem 5: Split topic "Command-line arguments. Library: Date class" into "Command-line arguments", "Library: Date class" (first keeps id command-line-arguments-library-date-class)
- sem 6: Split topic "DM ADM, and SDM" into "DM ADM", "SDM" (first keeps id dm-adm-and-sdm)
- sem 6: Split topic "Media access protocols (ALOHA, CSMA based)" into "Media access protocols (ALOHA", "CSMA based)" (first keeps id media-access-protocols-aloha-csma-based)
- sem 6: Split topic "Intra and Inter Autonomous System Routing (OSPF, RIP, BGP)" into "Intra and Inter Autonomous System Routing (OSPF", "RIP, BGP)" (first keeps id intra-and-inter-autonomous-system-routing-ospf-rip-bgp)
- sem 6: Split topic "Advanced Topics: QoS over IP, IPV6, and Infrastructure-less networks: wireless ad hoc and sensor networks, and Internet of Things (IoT)" into "Advanced Topics: QoS over IP", "IPV6", "Infrastructure-less networks: wireless ad hoc and sensor networks", "Internet of Things (IoT)" (first keeps id advanced-topics-qos-over-ip-ipv6-and-infrastructure-less)
- sem 6: Split topic "concept of Array, Matrix, and Tensor representation of data" into "concept of Array, Matrix", "Tensor representation of data" (first keeps id concept-of-array-matrix-and-tensor-representation-of-data)
- sem 6: Split topic "concept of data preprocessing, data imbalance, Outliers, data sampling, feature engineering, Various dimensionality reduction techniques" into "concept of data preprocessing", "data imbalance, Outliers", "data sampling", "feature engineering", "Various dimensionality reduction techniques" (first keeps id concept-of-data-preprocessing-data-imbalance-outliers-data)
- sem 6: Split topic "Various evaluation Matrix: absolute error, Square error, Sum of square error, Mean Square error, log loss, accuracy, precision, recall, ROC, AUC, F1 score, confusion matrix" into "Various evaluation Matrix: absolute error", "Square error", "Sum of square error", "Mean Square error", "log loss, accuracy, precision, recall", "ROC", "AUC", "F1 score", "confusion matrix" (first keeps id various-evaluation-matrix-absolute-error-square-error-sum-of)
- sem 6: Split topic "Concept of optimization" into "Concept of optimization", "concept of convex optimization" (first keeps id concept-of-optimization)
- sem 6: Split topic "Gradient Descent" into "Gradient Descent", "Stochastic Gradient Descent (SGD)", "Mini-Batch Gradient Descent" (first keeps id gradient-descent)
- sem 6: Split topic "Random Forest" into "Random Forest", "Random Forest Regression" (first keeps id random-forest)
- sem 6: Split topic "Neural Network, Linear regression, Polynomial Regression" into "Neural Network", "Linear regression", "Polynomial Regression" (first keeps id linear-regression-ml)
- sem 6: Split topic "Concept of overfitting, underfitting, Bias-Variance Tradeoff" into "Concept of overfitting, underfitting", "Bias-Variance Tradeoff" (first keeps id concept-of-overfitting-underfitting-bias-variance-tradeoff)
- sem 6: Split topic "Load balancing" into "Load balancing", "dynamic and static load balancing" (first keeps id load-balancing)
- sem 6: Split topic "Fundamentals of Secure Deployment, Search Engine Optimization, DNS Record Management, Deploying MERN Stack Application on Web, Free Hosting Platforms, GitHub, Firebase, Heroku Note: The detailed sylla" into "Fundamentals of Secure Deployment", "Search Engine Optimization", "DNS Record Management", "Deploying MERN Stack Application on Web", "Free Hosting Platforms, GitHub, Firebase" (first keeps id fundamentals-of-secure-deployment-search-engine-optimization)
- sem 6: Split topic "Feature Extraction" into "Feature Extraction", "Feature Vectors and Feature Spaces" (first keeps id feature-extraction)
- sem 6: Split topic "Non parametric spectral estimation" into "Non parametric spectral estimation, Periodogram, windowing", "Parametric spectral estimation" (first keeps id spectral-estimation)
- sem 6: Split topic "Granger and other causality measures. Applications to speech enhancement" into "Granger and other causality measures", "Applications to speech enhancement" (first keeps id granger-and-other-causality-measures-applications-to-speech)
- sem 7: Split topic "evolutionary model" into "evolutionary model", "RAD model, V Model" (first keeps id spiral-iterative)
- sem 7: Split topic "Agile models: Extreme Programming, and Scrum. Requirement Gathering and Analysis" into "Agile models: Extreme Programming, Scrum", "Requirement Gathering and Analysis" (first keeps id agile-models-extreme-programming-and-scrum-requirement)
- sem 7: Split topic "Basic concepts of Object-Oriented Analysis & Design. User interface design" into "Basic concepts of Object-Oriented Analysis & Design", "User interface design" (first keeps id basic-concepts-of-object-oriented-analysis-and-design-user)
- sem 7: Split topic "Basic concepts in software reliability, reliability measures, reliability growth modeling, Quality SEI CMM, Characteristics of software maintenance, software reverse engineering, software reengineerin" into "Basic concepts in software reliability", "reliability measures", "reliability growth modeling", "Quality SEI CMM", "Characteristics of software maintenance", "software reverse engineering" (first keeps id basic-concepts-in-software-reliability-reliability-measures)
- sem 7: Split topic "Instruction Set and Assembly language programming: Data transfer, arithmetic, logic and branch instructions, addressing Modes" into "Instruction Set and Assembly language programming: Data transfer, arithmetic", "logic and branch instructions", "addressing Modes", "using assembly instructions" (first keeps id assembly-programming)
- sem 7: Split topic "Programming the on-chip modules/capabilities of the microcontroller using Embedded C: GPIOs, Timers/Counters, Waveform generation, EEPROM, ADC, Interrupt functionalities, Watchdog timer" into "Programming the on-chip modules/capabilities of the microcontroller using Embedded C: GPIOs", "Timers/Counters", "Waveform generation", "EEPROM", "ADC", "Interrupt functionalities", "Watchdog timer" (first keeps id programming-the-on-chip-modules-capabilities-of-the)
- sem 7: Split topic "Programming the serial communication modules: USART, Serial Peripheral Interface (SPI), I2C Inter-integrated Circuit (I2C)" into "Programming the serial communication modules: USART", "Serial Peripheral Interface (SPI)", "I2C Inter-integrated Circuit (I2C)" (first keeps id programming-the-serial-communication-modules-usart-serial)
- sem 7: Split topic "RTC. Interfacing wireless modules: Bluetooth" into "RTC", "Interfacing wireless modules: Bluetooth" (first keeps id rtc-interfacing-wireless-modules-bluetooth)
- sem 7: Split topic "Trends in VLSI/Semiconductor industry, related to technology (Moore’s) scaling" into "Trends in VLSI/Semiconductor industry", "related to technology (Moore’s) scaling" (first keeps id trends-in-vlsi-semiconductor-industry-related-to-technology)
- sem 7: Split topic "Overview of semiconductor devices inherent in the MOSFET: MOSFET I/V Characteristics, MOSFET C/V Characteristics, Second Order Effects" into "Overview of semiconductor devices inherent in the MOSFET: MOSFET I/V Characteristics", "MOSFET C/V Characteristics", "Second Order Effects" (first keeps id overview-of-semiconductor-devices-inherent-in-the-mosfet)
- sem 7: Split topic "DC Transfer Characteristics: CMOS inverter DC Characteristics, Beta Ratio Effects, Noise Margins, Pass Transistor DC Characteristics" into "DC Transfer Characteristics: CMOS inverter DC Characteristics", "Beta Ratio Effects", "Noise Margins", "Pass Transistor DC Characteristics" (first keeps id dc-transfer-characteristics-cmos-inverter-dc-characteristics)
- sem 7: Split topic "Delay in Multistage Logic Networks. Timing analysis delay models Power: Sources of power" into "Delay in Multistage Logic Networks", "Timing analysis delay models Power: Sources of power" (first keeps id delay-in-multistage-logic-networks-timing-analysis-delay)
- sem 7: Split topic "CPL, transmission gates, DPL, etc)" into "CPL", "transmission gates", "DPL, etc)" (first keeps id cpl-transmission-gates-dpl-etc)
- sem 7: Split topic "Dynamic logic (domino, NP domino, Zipper)" into "Dynamic logic (domino", "NP domino, Zipper)" (first keeps id dynamic-logic-domino-np-domino-zipper)
- sem 7: Split topic "Hybrid logic style and examples (Full-Adder, MUX, XOR), Pitfalls of various families, Stick diagram" into "Hybrid logic style and examples (Full-Adder", "MUX, XOR)", "Pitfalls of various families", "Stick diagram" (first keeps id hybrid-logic-style-and-examples-full-adder-mux-xor-pitfalls)
- sem 7: Split topic "Sequential Design: Sequencing Static Circuits, Max-Delay Constraints, Min-Delay Constraints, Time Borrowing, Clock Skew, Circuit Design of Latches and Flip-Flops" into "Sequential Design: Sequencing Static Circuits", "Min-Delay Constraints", "Time Borrowing", "Clock Skew", "Circuit Design of Latches and Flip-Flops" (first keeps id sequential-design-sequencing-static-circuits-max-delay)
- sem 7: Split topic "Carry ripple adder, carry look ahead adder, Manchester carry chain adder, carry skip adder, carry select adder, shifters, multipliers, SRAM, DRAM, and other memories" into "Carry ripple adder", "carry look ahead adder", "Manchester carry chain adder", "carry skip adder", "carry select adder, shifters, multipliers", "SRAM", "DRAM", "other memories" (first keeps id carry-ripple-adder-carry-look-ahead-adder-manchester-carry)
- sem 7: Split topic "Block Ciphers (DES, AES) : Feistal Cipher Structure" into "Block Ciphers (DES", "AES) : Feistal Cipher Structure" (first keeps id block-ciphers-des-aes-feistal-cipher-structure)
- sem 7: Split topic "Simplifies DES" into "Simplifies DES", "DES" (first keeps id simplifies-des)
- sem 7: Split topic "Modes & Rays. Basic Optical Communication System" into "Modes & Rays", "Basic Optical Communication System" (first keeps id modes-and-rays-basic-optical-communication-system)
- sem 7: Split topic "Network Topologies. Advanced Multiplexing Strategies- OFDM" into "Network Topologies", "Advanced Multiplexing Strategies- OFDM" (first keeps id network-topologies-advanced-multiplexing-strategies-ofdm)
- sem 7: Split topic "SDM. Subcarrier Multiplexing" into "SDM", "Subcarrier Multiplexing" (first keeps id sdm-subcarrier-multiplexing)
- sem 7: Split topic "Cloud Computing, and Embedded Systems" into "Cloud Computing", "Embedded Systems" (first keeps id cloud-computing-and-embedded-systems)
- sem 7: Split topic "Path Loss and Shadowing: Radio Wave Propagation, Transmit & Receive Signal Models, Free-Space Path Loss, Shadow Fading" into "Path Loss and Shadowing: Radio Wave Propagation", "Transmit & Receive Signal Models", "Free-Space Path Loss", "Shadow Fading" (first keeps id path-loss-and-shadowing-radio-wave-propagation-transmit-and)
- sem 7: Split topic "Statistical Multipath Channel Models: Narrowband and Wideband Fading, Rayleigh and Rician Fading Distribution" into "Statistical Multipath Channel Models: Narrowband and Wideband Fading", "Rayleigh and Rician Fading Distribution" (first keeps id statistical-multipath-channel-models-narrowband-and-wideband)
- sem 7: Split topic "Performance Analysis over Fading Channel: Outage Probability, Average Probability of Error, Capacity" into "Performance Analysis over Fading Channel: Outage Probability", "Average Probability of Error, Capacity" (first keeps id performance-analysis-over-fading-channel-outage-probability)
- sem 7: Split topic "SIMO, MISO and MIMO Models" into "SIMO", "MISO and MIMO Models" (first keeps id simo-miso-and-mimo-models)
- sem 7: Split topic "Receiver Diversity: Selection Combining, Equal Gain Combining, Maximal-Ratio Combining, Transmit Diversity: Alamouti Space-Time Coding Scheme" into "Receiver Diversity: Selection Combining", "Equal Gain Combining", "Maximal-Ratio Combining", "Transmit Diversity: Alamouti Space-Time Coding Scheme" (first keeps id receiver-diversity-selection-combining-equal-gain-combining)
- sem 7: Split topic "Spread Spectrum Communication: Spread Spectrum Principles, Direct Sequence Spread Spectrum, Frequency Hoping Spread Spectrum" into "Spread Spectrum Communication: Spread Spectrum Principles", "Direct Sequence Spread Spectrum", "Frequency Hoping Spread Spectrum" (first keeps id spread-spectrum-communication-spread-spectrum-principles)
- sem 7: Split topic "Multicarrier Modulation Schemes: Orthogonal Frequency Division Multiplexing (OFDM), Cyclic Prefix, Case Study: The IEEE 802.11a Wireless LAN Standard" into "Multicarrier Modulation Schemes: Orthogonal Frequency Division Multiplexing (OFDM)", "Cyclic Prefix", "Case Study: The IEEE 802.11a Wireless LAN Standard" (first keeps id multicarrier-modulation-schemes-orthogonal-frequency)
- sem 7: Split topic "Proof of work. Introducing Bitcoin" into "Proof of work", "Introducing Bitcoin" (first keeps id proof-of-work-introducing-bitcoin)
- sem 7: Split topic "Blockchain mining. Bitcoin Network and payments" into "Blockchain mining", "Bitcoin Network and payments" (first keeps id blockchain-mining-bitcoin-network-and-payments)
- sem 7: Split topic "Bitcoin Clients and APIs. Alternative Coins. Limitations of Bitcoin" into "Bitcoin Clients and APIs", "Alternative Coins", "Limitations of Bitcoin" (first keeps id bitcoin-clients-and-apis-alternative-coins-limitations-of)
- sem 7: Split topic "Pseudo-anonymity vs. anonymity, Zcash and Zk-SNARKS for anonymity preservation, attacks on Blockchains" into "Pseudo-anonymity vs. anonymity", "Zcash and Zk-SNARKS for anonymity preservation", "attacks on Blockchains" (first keeps id pseudo-anonymity-vs-anonymity-zcash-and-zk-snarks-for)
- sem 7: Split topic "such as Sybil attacks, selfish mining and 51% attacks" into "such as Sybil attacks", "selfish mining and 51% attacks" (first keeps id such-as-sybil-attacks-selfish-mining-and-51-attacks)
- sem 7: Split topic "Case Studies of blockchain in Finance, Management and Government" into "Case Studies of blockchain in Finance", "Management and Government" (first keeps id case-studies-of-blockchain-in-finance-management-and)
- sem 7: Split topic "Dalvik virtual machine – DVM" into "Dalvik virtual machine", "DVM" (first keeps id dalvik-virtual-machine-dvm)
- sem 7: Split topic "Button" into "Image Button", "Toggle Button" (first keeps id button)

</details>

<details><summary>extra item not in any handout (13)</summary>

- sem 2: Retire topic "Max" in chapter "Modules, File and Exception Handling"
- sem 3: Retire topic "the credits shown here follow the official course structure table" in chapter "Sorting and Searching and Hashing"
- sem 5: Retire topic "etc" in chapter "Turing Machines and Intermediate Code Generation Phase"
- sem 5: Retire topic "Note: The detailed syllabus page for this course prints L-T-P-C as 2-1-0-3" in chapter "Front-end Web Development with React.js"
- sem 5: Retire topic "the credits shown here follow the official course structure table" in chapter "Front-end Web Development with React.js"
- sem 6: Retire topic "etc" in chapter "Physical and Data Link Layers"
- sem 6: Retire topic "the credits shown here follow the official course structure table" in chapter "Various applications of Machine learning"
- sem 6: Retire topic "the credits shown here follow the official course structure table" in chapter "Deployment of MERN Stack Web Applications"
- sem 7: Retire topic "Note: The detailed syllabus page for this course prints L-T-P-C as 3-1-0-4" in chapter "Software Reliability and Software Maintenance"
- sem 7: Retire topic "the credits shown here follow the official course structure table" in chapter "Software Reliability and Software Maintenance"
- sem 7: Retire topic "16x2 LCD" in chapter "I/o Interfacing in Embedded System"
- sem 7: Retire topic "Note: The detailed syllabus page for this course prints L-T-P-C as 3-0-0-0" in chapter "Datapath and array subsystem design"
- sem 7: Retire topic "the credits shown here follow the official course structure table" in chapter "Datapath and array subsystem design"

</details>

### me

<details><summary>course missing from branch/semester (6)</summary>

- sem 1: Link pdeu-environment-science-ce-ece to me sem 1 (code 24CV101T)
- sem 1: Link pdeu-computer-programming-i-ce to me sem 1 (code 24CP101T)
- sem 1: Link lab pdeu-engineering-graphics-ce-petro to me sem 1 (code 24ME102T)
- sem 1: Link pdeu-universal-human-values-ce to me sem 1 (code 24HS102T)
- sem 2: Link pdeu-elements-of-electrical-and-electronics-engineering-biotech to me sem 2 (code 24EE101T)
- sem 2: Link pdeu-indian-knowledge-system-biotech to me sem 2 (code 24HS103T)

</details>

<details><summary>course in wrong semester (5)</summary>

- sem 4: Move pdeu-strength-of-material for me from sem 3 to sem 4
- sem 5: Move pdeu-manufacturing-process-i for me from sem 4 to sem 5
- sem 6: Move pdeu-production-operation-management for me from sem 5 to sem 6
- sem 6: Move pdeu-manufacturing-process-ii for me from sem 5 to sem 6
- sem 7: Move pdeu-computer-aided-design for me from sem 6 to sem 7

</details>

<details><summary>new course (21)</summary>

- sem 1: Add course "Biology For Engineers" (24BT102T, 4 units): same name as pdeu-biology-for-engineers-biotech, but only 47% of its topics are in it
- sem 2: Add course "Computer Programming II (For ME/CL/CH/BT)" (24CP102T, 4 units): same name as pdeu-computer-programming-ii-ce, but only 35% of its topics are in it
- sem 3: Add course "Introduction to Artificial Intelligence in Mechanical Engineering" (24ME201T, 4 units)
- sem 3: Add course "Engineering Mechanics" (24ME202T, 4 units)
- sem 3: Add course "Thermodynamics" (24ME203T, 4 units)
- sem 4: Add course "Fluid Mechanics" (24ME206T, 4 units): same name as pdeu-fluid-mechanics-with-lab, but only 20% of its topics are in it
- sem 5: Add course "Introduction to Composite Materials" (24ME331T, 4 units)
- sem 5: Add course "Renewable and Sustainable Energy Technologies" (24ME332T, 4 units)
- sem 5: Add course "Laser & electron beam Material Processing" (24ME334T, 4 units)
- sem 6: Add course "Mechanical Vibrations" (24ME335T, 4 units)
- sem 6: Add course "Additive Manufacturing" (24ME336T, 4 units)
- sem 6: Add course "Heat Exchanger Design" (24ME338T, 4 units)
- sem 7: Add course "Exergy Analysis of Thermal System" (24ME431T, 4 units)
- sem 7: Add course "Micro and Nano Manufacturing" (24ME433T, 4 units)
- sem 7: Add course "Cryogenics" (24ME434T, 4 units)
- sem 7: Add course "Welding for Metal Joining, Surfacing and Additive Manufacturing" (24ME436T, 4 units)
- sem 7: Add course "Automobile Engineering" (24ME437T, 4 units)
- sem 7: Add course "Non-Destructive testing and failure analysis" (24ME439T, 4 units)
- sem 7: Add course "Material and Procurement Management" (24ME440T, 4 units)
- sem 7: Add course "Optimization Techniques" (24ME401T, 4 units)
- sem 7: Add course "Project Management" (24ME402T, 4 units): same name as pdeu-project-management-with-lab, but only 9% of its topics are in it

</details>

<details><summary>new practical course (22)</summary>

- sem 1: Add lab "Engineering Physics Laboratory" (15 experiments), related to Engineering Physics (For ME, Civil)
- sem 1: Add lab "Computer Programming Laboratory – I" (9 experiments), related to Computer Programming – I
- sem 1: Add lab "Workshop Practice" (10 experiments)
- sem 2: Add lab "Engineering Chemistry Laboratory" (11 experiments), related to Engineering Chemistry
- sem 2: Add lab "Computer Programming II Laboratory (For ME/CL/CH/BT)" (9 experiments), related to Computer Programming II (For ME/CL/CH/BT)
- sem 2: Add lab "Elements of Electrical and Electronics Engineering – Lab" (14 experiments), related to Elements of Electrical and Electronics Engineering
- sem 3: Add lab "Thermodynamics Laboratory" (10 experiments), related to Thermodynamics
- sem 3: Add lab "Mechanical Measurements and Metrology Laboratory" (10 experiments), related to Mechanical Measurements and Metrology
- sem 3: Add lab "Mechanical Drawing Laboratory" (13 experiments)
- sem 4: Add lab "Industry 4.0 Laboratory for Mechanical Engineers" (11 experiments), related to Industry 4.0 for Mechanical Engineers
- sem 4: Add lab "Fluid Mechanics Laboratory" (9 experiments), related to Fluid Mechanics
- sem 4: Add lab "Design and Kinematics of Machines Laboratory" (10 experiments), related to Design and Kinematics of Machines
- sem 4: Add lab "Engineering Metallurgy Lab" (2 experiments), related to Engineering Metallurgy
- sem 4: Add lab "Strength of Materials Laboratory" (9 experiments)
- sem 5: Add lab "Heat Transfer Laboratory" (9 experiments), related to Heat Transfer
- sem 5: Add lab "Dynamics of Machines Laboratory" (12 experiments), related to Dynamics of Machines
- sem 5: Add lab "Manufacturing Process-I Laboratory" (12 experiments), related to Manufacturing Process-I
- sem 6: Add lab "Refrigeration and Air-conditioning Laboratory" (10 experiments), related to Refrigeration and Air-conditioning
- sem 6: Add lab "Machine Design -I Laboratory" (9 experiments), related to Machine Design - I
- sem 6: Add lab "Manufacturing Process- II Laboratory" (10 experiments), related to Manufacturing Process- II
- sem 6: Add lab "Robotics Laboratory" (10 experiments), related to Robotics
- sem 7: Add lab "Computational Engineering Laboratory" (3 experiments)

</details>

<details><summary>unit wrong order (11)</summary>

- sem 1: Move chapter "Infinite Series & Improper Integrals" to position 1
- sem 1: Move chapter "Calculus for single variable" to position 3
- sem 4: Move chapter "Fundamentals of Kinematics and Mechanisms" to position 1
- sem 4: Move chapter "Unit 1" to position 2
- sem 4: Move chapter "Design of Shafts" to position 3
- sem 4: Move chapter "TORSION" to position 3
- sem 4: Move chapter "DEFLECTION OF BEAMS" to position 4
- sem 6: Move chapter "Refrigerants" to position 1
- sem 6: Move chapter "Introduction" to position 2
- sem 7: Move chapter "18" to position 1
- sem 7: Move chapter "20" to position 2

</details>

<details><summary>unit missing (16)</summary>

- sem 1: Add unit 2 "Physics of Solids" (19 topics) to pdeu-physics-theory-me
- sem 1: Add unit 4 "Thermal Physics" (19 topics) to pdeu-physics-theory-me
- sem 2: Add unit 2 "Matrix Algebra and Its Applications" (8 topics) to pdeu-mathematics-ii-me
- sem 2: Add unit 4 "Fourier Series" (8 topics) to pdeu-mathematics-ii-me
- sem 2: Add unit 2 "Modern Analytical Techniques" (6 topics) to pdeu-chemistry-theory-me
- sem 2: Add unit 3 "Adsorption, Catalysis and Kinetics" (11 topics) to pdeu-chemistry-theory-me
- sem 2: Add unit 4 "Chemistry of Energy Devices" (5 topics) to pdeu-chemistry-theory-me
- sem 3: Add unit 1 "Laplace Transform" (8 topics) to pdeu-maths-iii
- sem 3: Add unit 2 "Difference Equation and Z-Transform" (6 topics) to pdeu-maths-iii
- sem 3: Add unit 3 "Fourier Transform" (10 topics) to pdeu-maths-iii
- sem 4: Add unit 1 "Testing of metals" (7 topics) to pdeu-engineering-metallurgy
- sem 5: Add unit 4 "Other Manufacturing Processes" (10 topics) to pdeu-manufacturing-process-i
- sem 6: Add unit 3 "Service Processes" (15 topics) to pdeu-production-operation-management
- sem 6: Add unit 4 "Cooling/Heating Load Calculation, Air Conditioning Systems & Components Design" (6 topics) to pdeu-refrigeration-and-air-conditioning
- sem 6: Add unit 4 "Drilling, Boring and Grinding Machines" (8 topics) to pdeu-manufacturing-process-ii
- sem 6: Add unit 4 "Dynamics of Robot" (6 topics) to pdeu-robotics

</details>

<details><summary>unit rename (9)</summary>

- sem 4: Rename chapter "Unit 1" to "Design of Joints and Spring"
- sem 4: Rename chapter "Unit 4" to "Kinematic Synthesis"
- sem 4: Rename chapter "Unit 2" to "Ferrous and Non-Ferrous materials"
- sem 5: Rename chapter "Unit 1" to "Casting"
- sem 5: Rename chapter "Unit 2" to "Metal Working Processes"
- sem 7: Rename chapter "18" to "Design of Gear Drives"
- sem 7: Rename chapter "20" to "Design of Bearings"
- sem 7: Rename chapter "08" to "Design of Gear Box"
- sem 7: Rename chapter "14" to "Design of Material Handling Equipment"

</details>

<details><summary>topic under wrong unit (38)</summary>

- sem 1: Move topic "Change of order of integration" from chapter "Calculus for of Several variable" to "Calculus for single variable"
- sem 1: Move topic "Mass" from chapter "Calculus for of Several variable" to "Calculus for single variable"
- sem 1: Move topic "directional derivative and gradient" from chapter "Calculus for of Several variable" to "Vector Calculus"
- sem 4: Move topic "design procedure" from chapter "Unit 1" to "Fundamentals of Kinematics and Mechanisms"
- sem 4: Move topic "Properties and coding of various materials" from chapter "Unit 1" to "Fundamentals of Kinematics and Mechanisms"
- sem 4: Move topic "factors of safety" from chapter "Unit 1" to "Fundamentals of Kinematics and Mechanisms"
- sem 4: Move topic "Selection of materials" from chapter "Unit 1" to "Fundamentals of Kinematics and Mechanisms"
- sem 4: Move topic "design of rocker arm for exhaust valves. Design of Mechanical Springs: Types of springs" from chapter "Design of Shafts" to "Unit 1"
- sem 4: Move topic "Materials for Springs" from chapter "Design of Shafts" to "Unit 1"
- sem 4: Move topic "deflection and buckling of helical springs" from chapter "Design of Shafts" to "Unit 1"
- sem 4: Move topic "Helical Springs of non-circular cross-sections" from chapter "Design of Shafts" to "Unit 1"
- sem 4: Move topic "Helical Tension spring" from chapter "Design of Shafts" to "Unit 1"
- sem 4: Move topic "Energy storage capacity" from chapter "Design of Shafts" to "Unit 1"
- sem 4: Move topic "Helical torsion springs" from chapter "Design of Shafts" to "Unit 1"
- sem 4: Move topic "Co-axial springs" from chapter "Design of Shafts" to "Unit 1"
- sem 4: Move topic "leaf springs" from chapter "Design of Shafts" to "Unit 1"
- sem 4: Move topic "uniformly varying loads and combination of these loads" from chapter "SIMPLE STRESSES AND STRAINS" to "FLEXURAL STRESSES"
- sem 4: Move topic "stress" from chapter "SIMPLE STRESSES AND STRAINS" to "TORSION"
- sem 5: Move topic "electrical analogy" from chapter "Introduction" to "Thermal Radiation"
- sem 5: Move topic "Applications of the heat transfer" from chapter "Introduction" to "Heat Exchangers"
- sem 5: Move topic "Introduction" from chapter "Brakes and Dynamometers" to "Vibration"
- sem 5: Move topic "General description and study of operation principle" from chapter "Brakes and Dynamometers" to "Vibration"
- sem 5: Move topic "causes and remedies of defects" from chapter "Welding and cutting" to "Unit 2"
- sem 6: Move topic "Material Requirements Planning (MRP): Components and structure of MRP (demand for products, bill of materials, inventory records, MRP computer program)" from chapter "Operations Management" to "Operations Scheduling"
- sem 6: Move topic "MRP logic" from chapter "Operations Management" to "Operations Scheduling"
- sem 6: Move topic "lot sizing in MRP systems (LFL, EOQ, POQ, LTC, LUC, etc.)" from chapter "Operations Management" to "Operations Scheduling"
- sem 6: Move topic "the basic EOQ model" from chapter "Operations Management" to "Operations Scheduling"
- sem 6: Move topic "Introduction to Refrigeration" from chapter "Introduction" to "Refrigerants"
- sem 6: Move topic "Vapour Compression Refrigeration: Working principle and essential components of the plant, simple vapour compression refrigeration cycle - COP, Representation of cycle on T-S and p-h charts" from chapter "Introduction" to "Refrigerants"
- sem 6: Move topic "Actual cycle, Influence of various parameters on system performance" from chapter "Introduction" to "Refrigerants"
- sem 6: Move topic "cycle analysis" from chapter "Introduction" to "Refrigerants"
- sem 6: Move topic "necessity of multi-staging, multistage compression system, and their analysis, multi-evaporator system and their analysis, necessity and working of cascading system" from chapter "Introduction" to "Refrigerants"
- sem 6: Move topic "description and working of NH3- water system and LiBr —water" from chapter "Refrigerants" to "Introduction"
- sem 6: Move topic "three fluid absorption system and its salient features" from chapter "Refrigerants" to "Introduction"
- sem 6: Move topic "Introduction" from chapter "Jigs and Fixtures" to "Milling machine"
- sem 6: Move topic "trajectory planning and control Robotic sensing devices: Position" from chapter "Motion planning" to "Introduction"
- sem 6: Move topic "transformations" from chapter "Introduction" to "Kinematics and Dynamics"
- sem 7: Move topic "Introduction" from chapter "Finite Element Method" to "Plane & Space Curves"

</details>

<details><summary>topic missing (140)</summary>

- sem 1: Add topic "Definition, Convergent, divergent, bounded & monotone sequences" to chapter "Infinite Series & Improper Integrals"
- sem 1: Add topic "Infinite sums: Basics" to chapter "Infinite Series & Improper Integrals"
- sem 1: Add topic "Tests for convergence for positive term series" to chapter "Infinite Series & Improper Integrals"
- sem 1: Add topic "Absolute convergence" to chapter "Infinite Series & Improper Integrals"
- sem 1: Add topic "conditional convergence" to chapter "Infinite Series & Improper Integrals"
- sem 1: Add topic "Convergence of power series" to chapter "Infinite Series & Improper Integrals"
- sem 1: Add topic "Maxima and Minima of two variables using Lagrange’s multipliers" to chapter "Calculus for of Several variable"
- sem 1: Add topic "Taylor’s series" to chapter "Calculus for of Several variable"
- sem 1: Add topic "Change of variables" to chapter "Calculus for single variable"
- sem 1: Add topic "Evaluation of triple integral" to chapter "Calculus for single variable"
- sem 1: Add topic "center of gravity by double and triple integral" to chapter "Calculus for single variable"
- sem 1: Add topic "Gradient, divergence and curl" to chapter "Vector Calculus"
- sem 1: Add topic "Irrotational and Solenoidal vector fields" to chapter "Vector Calculus"
- sem 1: Add topic "Vector Integration" to chapter "Vector Calculus"
- sem 1: Add topic "Simple problems on line" to chapter "Vector Calculus"
- sem 1: Add topic "surface and volume integrals" to chapter "Vector Calculus"
- sem 1: Add topic "Green’s theorem in a plane" to chapter "Vector Calculus"
- sem 1: Add topic "Gauss divergence theorem and Stokes’ theorem (without proofs)" to chapter "Vector Calculus"
- sem 1: Add topic "Simple application involving cubes and rectangular parallelepipeds" to chapter "Vector Calculus"
- sem 1: Add topic "GaussDivergence Theorem" to chapter "Vector concepts & applications in Physics"
- sem 1: Add topic "The everyday forces of Physics" to chapter "Vector concepts & applications in Physics"
- sem 1: Add topic "Work-energy theorem" to chapter "Vector concepts & applications in Physics"
- sem 1: Add topic "Rigid body motion and the conservation of angular momentum" to chapter "Vector concepts & applications in Physics"
- sem 1: Add topic "Center of mass" to chapter "Vector concepts & applications in Physics"
- sem 1: Add topic "Center of gravity" to chapter "Vector concepts & applications in Physics"
- sem 1: Add topic "Moment of inertia: Definition" to chapter "Vector concepts & applications in Physics"
- sem 1: Add topic "Moment of inertia of simple planar laminas" to chapter "Vector concepts & applications in Physics"
- sem 2: Add topic "Harmonic function and its significance, Singularities" to chapter "Complex Analysis"
- sem 2: Add topic "Contour integrals" to chapter "Complex Analysis"
- sem 2: Add topic "CIF for derivatives" to chapter "Complex Analysis"
- sem 2: Add topic "Taylor’s series and Laurent Series" to chapter "Complex Analysis"
- sem 2: Add topic "Applications of residues to evaluate real definite integrals" to chapter "Complex Analysis"
- sem 2: Add topic "metallic materials, polymeric" to chapter "Corrosion and its Control"
- sem 2: Add topic "Carbonaceous materials (fullerene" to chapter "Corrosion and its Control"
- sem 2: Add topic "carbon nanotube, graphene, etc.)" to chapter "Corrosion and its Control"
- sem 2: Add topic "Composite materials" to chapter "Corrosion and its Control"
- sem 3: Add topic "Formation of Partial Differential Equations (PDEs)" to chapter "Partial Differential Equations and its Applications"
- sem 3: Add topic "Solutions of PDEs of the first order" to chapter "Partial Differential Equations and its Applications"
- sem 3: Add topic "Cauchy problem for first-order PDEs" to chapter "Partial Differential Equations and its Applications"
- sem 3: Add topic "Lagrange’s method" to chapter "Partial Differential Equations and its Applications"
- sem 3: Add topic "Charpit and Jacobi methods for solving first-order nonlinear PDEs" to chapter "Partial Differential Equations and its Applications"
- sem 3: Add topic "Classification of second order PDEs" to chapter "Partial Differential Equations and its Applications"
- sem 3: Add topic "Applications of PDE’s to wave analysis" to chapter "Partial Differential Equations and its Applications"
- sem 3: Add topic "Design of Limit gauging: Taylor’s Principle" to chapter "Limits, Fits, Tolerance and Limit gauging"
- sem 3: Add topic "Measurement of Vacuum" to chapter "Limits, Fits, Tolerance and Limit gauging"
- sem 3: Add topic "HighPressure Measurement" to chapter "Limits, Fits, Tolerance and Limit gauging"
- sem 3: Add topic "sine bar and center, clinometers, collimator" to chapter "Linear and Angular metrology"
- sem 3: Add topic "symbolic representation" to chapter "Linear and Angular metrology"
- sem 3: Add topic "measurement techniques" to chapter "Linear and Angular metrology"
- sem 3: Add topic "Uncertainty of Measurement-Uncertainty Issues" to chapter "Inspection and quality control"
- sem 3: Add topic "Uncertainty Calculations" to chapter "Inspection and quality control"
- sem 4: Add topic "role of design in industry 4.0" to chapter "Fundamentals of Kinematics and Mechanisms"
- sem 4: Add topic "concurrent engineering" to chapter "Fundamentals of Kinematics and Mechanisms"
- sem 4: Add topic "CAE" to chapter "Fundamentals of Kinematics and Mechanisms"
- sem 4: Add topic "CAD, simulation" to chapter "Fundamentals of Kinematics and Mechanisms"
- sem 4: Add topic "various computation tools used to design" to chapter "Fundamentals of Kinematics and Mechanisms"
- sem 4: Add topic "modelling and analysis" to chapter "Fundamentals of Kinematics and Mechanisms"
- sem 4: Add topic "Metallography: Optical and electron microscopy (OM" to chapter "Structure Property Relation"
- sem 4: Add topic "SEM" to chapter "Structure Property Relation"
- sem 4: Add topic "EBSD" to chapter "Structure Property Relation"
- sem 4: Add topic "TEM, XRD)" to chapter "Structure Property Relation"
- sem 4: Add topic "Corrosion in metallic materials" to chapter "Unit 2"
- sem 4: Add topic "Non- ferrous metals and alloys: Al" to chapter "Unit 2"
- sem 4: Add topic "shape memory alloy" to chapter "Heat Treatment"
- sem 4: Add topic "statically indeterminate bars" to chapter "SIMPLE STRESSES AND STRAINS"
- sem 4: Add topic "Shear force and bending moment by taking examples of S.F and B.M diagrams for beams subjected to concentrated loads" to chapter "FLEXURAL STRESSES"
- sem 4: Add topic "applicability to beam" to chapter "TORSION"
- sem 4: Add topic "solid circle" to chapter "TORSION"
- sem 4: Add topic "hollow circle, T section, I section" to chapter "TORSION"
- sem 4: Add topic "Torsion: Introduction torsion" to chapter "TORSION"
- sem 4: Add topic "Shaft in parallel and series" to chapter "TORSION"
- sem 4: Add topic "Energy Methods: Strain energy" to chapter "DEFLECTION OF BEAMS"
- sem 4: Add topic "Strain energy for Normal" to chapter "DEFLECTION OF BEAMS"
- sem 4: Add topic "shear and bending stress" to chapter "DEFLECTION OF BEAMS"
- sem 4: Add topic "Castigliano’s theorm" to chapter "DEFLECTION OF BEAMS"
- sem 5: Add topic "cylindrical and spherical coordinates" to chapter "Introduction"
- sem 5: Add topic "Extended surfaces: Fin performance parameters" to chapter "Introduction"
- sem 5: Add topic "approximate analytical and graphical solutions for plane walls and semi-infinite solids" to chapter "Introduction"
- sem 5: Add topic "reflectivity & transmissivity, blackbody" to chapter "Thermal Radiation"
- sem 5: Add topic "emissive power & emissivity" to chapter "Thermal Radiation"
- sem 5: Add topic "heat exchange between diffuse-grey bodies-radiation shield" to chapter "Thermal Radiation"
- sem 5: Add topic "heat exchange between enclosed grey surfaces" to chapter "Thermal Radiation"
- sem 5: Add topic "Heat Exchangers: Classification" to chapter "Heat Exchangers"
- sem 5: Add topic "correction factor for multi-pass arrangement" to chapter "Heat Exchangers"
- sem 5: Add topic "cross flow" to chapter "Heat Exchangers"
- sem 5: Add topic "free longitudinal and transverse vibrations" to chapter "Vibration"
- sem 5: Add topic "whirling speeds" to chapter "Vibration"
- sem 5: Add topic "free torsional vibrations of single" to chapter "Vibration"
- sem 5: Add topic "two and three rotor system" to chapter "Vibration"
- sem 5: Add topic "Introduction to casting, foundries" to chapter "Unit 1"
- sem 5: Add topic "prediction and remedies" to chapter "Unit 1"
- sem 5: Add topic "Destructive and NDT of welds" to chapter "Welding and cutting"
- sem 6: Add topic "operations strategy, Forecasting" to chapter "Operations Management"
- sem 6: Add topic "measures of error" to chapter "Operations Management"
- sem 6: Add topic "components of MRP" to chapter "Operations Scheduling"
- sem 6: Add topic "POQ" to chapter "Operations Scheduling"
- sem 6: Add topic "LTC" to chapter "Operations Scheduling"
- sem 6: Add topic "LUC, etc.)" to chapter "Operations Scheduling"
- sem 6: Add topic "Operations scheduling, loading" to chapter "Operations Scheduling"
- sem 6: Add topic "CPM" to chapter "Operations Scheduling"
- sem 6: Add topic "brief about planning, routing, scheduling, dispatching" to chapter "Operations Scheduling"
- sem 6: Add topic "COP" to chapter "Refrigerants"
- sem 6: Add topic "Representation of cycle on T-S and P-h charts" to chapter "Refrigerants"
- sem 6: Add topic "Actual cycle" to chapter "Refrigerants"
- sem 6: Add topic "multi-evaporator system and their analysis" to chapter "Refrigerants"
- sem 6: Add topic "cascade system" to chapter "Refrigerants"
- sem 6: Add topic "adiabatic cooling" to chapter "Psychometric & Human Comfort"
- sem 6: Add topic "numerical and experimental study-effect of process parameters, Shaping, slotting" to chapter "Lathe"
- sem 6: Add topic "Laws of robotics" to chapter "Introduction"
- sem 6: Add topic "Links joints" to chapter "Introduction"
- sem 6: Add topic "DOF" to chapter "Introduction"
- sem 6: Add topic "Arm and wrist configuration" to chapter "Introduction"
- sem 6: Add topic "End effector, Cylindrical" to chapter "Introduction"
- sem 6: Add topic "Polar & Articulated configurations" to chapter "Introduction"
- sem 6: Add topic "Classification of Robotic manipulators" to chapter "Introduction"
- sem 6: Add topic "Rotation of vectors" to chapter "Introduction"
- sem 6: Add topic "Translation of vectors" to chapter "Introduction"
- sem 6: Add topic "Rotation matrix" to chapter "Introduction"
- sem 6: Add topic "Description of Links and Joints" to chapter "Kinematics and Dynamics"
- sem 6: Add topic "Frame assignments to the manipulators" to chapter "Kinematics and Dynamics"
- sem 6: Add topic "Denavit-Hartenberg Notation" to chapter "Kinematics and Dynamics"
- sem 6: Add topic "D-H Parameters using software" to chapter "Kinematics and Dynamics"
- sem 6: Add topic "Kinematic relation between adjacent links" to chapter "Kinematics and Dynamics"
- sem 6: Add topic "Forward Kinematics" to chapter "Kinematics and Dynamics"
- sem 6: Add topic "Velocity propagation along links" to chapter "Motion planning"
- sem 6: Add topic "linear and angular velocity analysis" to chapter "Motion planning"
- sem 6: Add topic "manipulator Jacobian" to chapter "Motion planning"
- sem 6: Add topic "Jacobian singularity" to chapter "Motion planning"
- sem 6: Add topic "Jacobian in force analysis" to chapter "Motion planning"
- sem 6: Add topic "Manipulator trajectory and analysis" to chapter "Motion planning"
- sem 6: Add topic "Joint vs Cartesian space approach" to chapter "Motion planning"
- sem 6: Add topic "Open and closed loop control, Proportional" to chapter "Motion planning"
- sem 6: Add topic "Integral & Derivative (PID) Control" to chapter "Motion planning"
- sem 6: Add topic "Force and torque controls of manipulators" to chapter "Motion planning"
- sem 7: Add topic "DDA and Bresenham’s Algorithm of line" to chapter "CAD Fundamentals"
- sem 7: Add topic "Orthographic and Affine transformations" to chapter "Geometric Transformations"
- sem 7: Add topic "NURBS" to chapter "Plane & Space Curves"
- sem 7: Add topic "Introduction to Reverse Engineering" to chapter "Plane & Space Curves"
- sem 7: Add topic "Introduction to Virtual prototyping" to chapter "Plane & Space Curves"
- sem 7: Add topic "Case Studies" to chapter "Plane & Space Curves"

</details>

<details><summary>topic split (32)</summary>

- sem 1: Split topic "Simple harmonic motion" into "Simple harmonic motion", "Damped simple harmonic motion" (first keeps id simple-harmonic-motion)
- sem 1: Split topic "Energy Transport in Wave motion. Acoustics & Ultrasonic: Introduction to Sound" into "Energy Transport in Wave motion", "Acoustics & Ultrasonic: Introduction to Sound" (first keeps id energy-transport-in-wave-motion-acoustics-and-ultrasonic)
- sem 1: Split topic "Doppler Effect. Ultrasonic waves" into "Doppler Effect", "Ultrasonic waves" (first keeps id doppler-effect-ultrasonic-waves)
- sem 3: Split topic "Principle of Interchangeability, selective assembly, Tolerances, allowance, Maximum and Minimum Metal Conditions, Fits, System of Limits and Fits, Hole basis and shaft basis systems, Design of Limit g" into "Principle of Interchangeability", "Selective Assembly, Tolerances, allowance", "Maximum and Minimum Metal Conditions, Fits", "System of Limits and Fits", "Hole basis and shaft basis systems" (first keeps id principle-of-interchangeability-selective-assembly)
- sem 3: Split topic "Measurements of Strain, Speed, and Temperature: Measurement of Strain, Strain Gauge Material, Backing or Carrier Materials, Adhesives, Protective Coatings, Bonding of Gauges, Gauge Factor, Theory of S" into "Measurement of Strain: Strain Gauge Material", "Backing or Carrier Materials, Adhesives", "Protective Coatings", "Bonding of Gauges" (first keeps id measurements-of-strain-speed-and-temperature-measurement-of)
- sem 3: Split topic "Calibrations of the instruments, slip gauges" into "Calibration of the instruments", "slip gauges" (first keeps id calibrations-of-the-instruments-slip-gauges)
- sem 4: Split topic "Eccentrically loaded riveted joint. Welded Joint: Types of welded joints" into "eccentrically loaded riveted joint", "types of welded joints" (first keeps id eccentrically-loaded-riveted-joint-welded-joint-types-of)
- sem 4: Split topic "Design of solid and hollow shafts for strength and rigidity" into "Design of Shafts", "Design of solid and hollow shafts for strength and rigidity" (first keeps id design-of-solid-and-hollow-shafts-for-strength-and-rigidity)
- sem 4: Split topic "Design of shafts for combined bending and axial loads Design of Shaft Couplings: Types of couplings" into "Design of shafts for combined bending and axial loads", "Types of couplings" (first keeps id design-of-shafts-for-combined-bending-and-axial-loads-design)
- sem 4: Split topic "function and motion generation (Body guidance). Precision Positions" into "function and motion generation (Body guidance)", "Precision Positions" (first keeps id function-and-motion-generation-body-guidance-precision)
- sem 4: Split topic "Ferrous metals and Designation: Wrought and cast components, allotropy of iron, iron-carbon diagram, plain carbon steels, limitations of plain carbon steel, and advantages of alloy steels" into "Ferrous metals and Designation: Wrought and cast components", "allotropy of iron", "iron-carbon diagram", "plain carbon steels", "limitations of plain carbon steel", "advantages of alloy steels", "alloy steels", "cast irons" (first keeps id ferrous-metals-and-designation-wrought-and-cast-components)
- sem 4: Split topic "Effect of alloying elements on mechanical properties of steel, alloy steels, tool steels, stainless steels, cast irons" into "Effect of alloying elements on mechanical properties of steel", "tool steels", "stainless steels" (first keeps id effect-of-alloying-elements-on-mechanical-properties-of)
- sem 4: Split topic "hardening and tempering. Hardenability of steels" into "hardening and tempering", "Hardenability of steels" (first keeps id hardening-and-tempering-hardenability-of-steels)
- sem 5: Split topic "Fourier’s law of heat conduction" into "Fourier’s law", "Heat Conduction: Generalized (3D) heat conduction equation in the Cartesian" (first keeps id fouriers-law-of-heat-conduction)
- sem 5: Split topic "Variable thermal conductivity" into "thermal conductivity", "Variable thermal conductivity" (first keeps id variable-thermal-conductivity)
- sem 5: Split topic "overall heat transfer coefficient, and critical radius of insulation" into "overall heat transfer coefficient", "Critical radius of insulation" (first keeps id overall-heat-transfer-coefficient-and-critical-radius-of)
- sem 5: Split topic "laminar and turbulent heat flow correlations for external flow" into "Laminar and turbulent heat flow correlations for external flow", "heat transfer correlations for laminar and turbulent flow" (first keeps id laminar-and-turbulent-heat-flow-correlations-for-external)
- sem 5: Split topic "Intensity of radiation & solid angle, Lambert’s cosine law, shape factor" into "Intensity of radiation & solid angle", "Lambert’s cosine law", "shape factor" (first keeps id intensity-of-radiation-and-solid-angle-lamberts-cosine-law)
- sem 5: Split topic "Turning moment" into "turning moment", "turning moment diagrams" (first keeps id flywheel-turning-moment)
- sem 6: Split topic "Methods of Forecasting" into "time series methods of forecasting", "causal methods of forecasting" (first keeps id methods-of-forecasting)
- sem 6: Split topic "probabilistic time estimates, and project crashing" into "probabilistic time estimates", "project crashing" (first keeps id probabilistic-time-estimates-and-project-crashing)
- sem 6: Split topic "ozone depletion global warming, secondary refrigerants, future industrial refrigerants, recent development" into "ozone depletion global warming", "secondary refrigerants", "future industrial refrigerants", "recent development" (first keeps id ozone-depletion-global-warming-secondary-refrigerants-future)
- sem 6: Split topic "specific humidity, relative humidity percentage humidity and absolute humidity" into "specific humidity", "relative humidity percentage humidity and absolute humidity, temperatures" (first keeps id specific-humidity-relative-humidity-percentage-humidity-and)
- sem 6: Split topic "temperatures — dry bulb, wet bulb and dew point" into "dry bulb", "wet bulb and dew point" (first keeps id temperatures-dry-bulb-wet-bulb-and-dew-point)
- sem 6: Split topic "Psychometric processes: different types of psychometric processes sensible heating and cooling process, Latent heating and cooling process, heating with humidification, cooling with dehumidification, " into "Psychometric processes: different types of psychometric processes sensible heating and cooling process", "Latent heating and cooling process", "heating with humidification", "cooling with dehumidification" (first keeps id psychometric-processes-different-types-of-psychometric)
- sem 6: Split topic "fatigue strength" into "fatigue strength", "surface fatigue strength" (first keeps id fatigue-strength)
- sem 6: Split topic "Goodman’s line" into "Goodman’s line", "Modified Goodman’s line" (first keeps id goodmans-line)
- sem 6: Split topic "Design of interference joints — press / shrink fitted assemblies" into "Design of interference joints", "press / shrink fitted assemblies" (first keeps id design-of-interference-joints-press-shrink-fitted-assemblies)
- sem 6: Split topic "Design/selection of flat belt drive" into "Design/selection of flat belt drive", "design/selection of V-belt drive" (first keeps id design-selection-of-flat-belt-drive)
- sem 6: Split topic "Components of I.C. engine" into "Components of I.C. engine", "materials for engine components" (first keeps id components-of-i-c-engine)
- sem 6: Split topic "principle of working" into "Lathe: Lathe: Principle of working", "principle of working, classifications" (first keeps id principle-of-working)
- sem 7: Split topic "Assembly of Element Matrices and Vectors and Derivation of System Equations" into "Assembly of Element Matrices", "Derivation of System Equations" (first keeps id assembly-of-element-matrices-and-vectors-and-derivation-of)

</details>

<details><summary>extra item not in any handout (379)</summary>

- sem 1: Retire topic "Successive differentiation" in chapter "Calculus for single variable"
- sem 1: Retire topic "Leibnitz theorem (without proof)" in chapter "Calculus for single variable"
- sem 1: Retire topic "Taylor’s and Maclaurin's expansion of functions of single variable" in chapter "Calculus for single variable"
- sem 1: Retire topic "Fundamental theorem of Integral calculus" in chapter "Calculus for single variable"
- sem 1: Retire topic "Application of integrals to length" in chapter "Calculus for single variable"
- sem 1: Retire topic "volume and surface area of revolution. Curve Tracing: Asymptotes" in chapter "Calculus for single variable"
- sem 1: Retire topic "Taylor's and Maclaurin's expansion of functions of several variables" in chapter "Calculus for of Several variable"
- sem 1: Retire topic "Mamixa and minima of functions of several variables" in chapter "Calculus for of Several variable"
- sem 1: Retire topic "Lagrange's method of undetermined multipliers" in chapter "Calculus for of Several variable"
- sem 1: Retire topic "change of coordinates" in chapter "Calculus for of Several variable"
- sem 1: Retire topic "evaluation of area" in chapter "Calculus for of Several variable"
- sem 1: Retire topic "volumes of solids" in chapter "Calculus for of Several variable"
- sem 1: Retire topic "center of gravity and moment of inertia" in chapter "Calculus for of Several variable"
- sem 1: Retire topic "Comparison test, D' Alembert's ratio test, Raabe's test, logarithmic test, Cauchy's root test" in chapter "Infinite Series & Improper Integrals"
- sem 1: Retire topic "Convergence of improper integrals, Beta and Gamma functions and its properties" in chapter "Infinite Series & Improper Integrals"
- sem 1: Retire topic "Scalar and vector fields" in chapter "Vector Calculus"
- sem 1: Retire topic "Line and surface Integrals" in chapter "Vector Calculus"
- sem 1: Retire topic "Gradient divergent curl" in chapter "Vector Calculus"
- sem 1: Retire topic "Green’s Theorem and stoke’s theorem (without proof) with application and physical significance" in chapter "Vector Calculus"
- sem 1: Retire topic "Electrostatics and Electrodynamics: Gauss’s law in dielectric medium, Equation of continuity, Biot Savart law" in chapter "Vector concepts & applications in Physics"
- sem 1: Retire topic "Ampere’s law" in chapter "Vector concepts & applications in Physics"
- sem 1: Retire topic "magnetization and magnetic intensity, Faraday’s law of induction" in chapter "Vector concepts & applications in Physics"
- sem 1: Retire topic "generalization of Ampere’s law, displacement current, Maxwell’s equations, wave equation for electromagnetic radiation, electromagnetic wave propagation in free space and isotropic dielectric medium, " in chapter "Vector concepts & applications in Physics"
- sem 1: Retire chapter "Optics" (4 topics) of pdeu-physics-theory-me
- sem 1: Retire chapter "Laser & Fibre Optics" (3 topics) of pdeu-physics-theory-me
- sem 1: Retire pdeu-basic-electronics "Basic Electronics" for me sem 1 (in no handout)
- sem 1: Retire pdeu-element-of-civil-engg-and-mechanics "Element of Civil Engg. & Mechanics" for me sem 1 (in no handout)
- sem 2: Retire topic "Complex numbers" in chapter "Complex Analysis"
- sem 2: Retire topic "Conformal mapping and its type" in chapter "Complex Analysis"
- sem 2: Retire topic "Some standard & special conformal mappings" in chapter "Complex Analysis"
- sem 2: Retire topic "Evaluation of real definite integrals" in chapter "Complex Analysis"
- sem 2: Retire topic "Independence and dependence of functions" in chapter "Ordinary differential equation"
- sem 2: Retire chapter "Partial Differential Equations" (6 topics) of pdeu-mathematics-ii-me
- sem 2: Retire chapter "Laplace transforms" (8 topics) of pdeu-mathematics-ii-me
- sem 2: Retire chapter "Water and its Treatment" (8 topics) of pdeu-chemistry-theory-me
- sem 2: Retire topic "Theories of corrosion" in chapter "Corrosion and its Control"
- sem 2: Retire topic "Types of corrosion" in chapter "Corrosion and its Control"
- sem 2: Retire topic "Protection of metals from corrosion — organic and inorganic materials" in chapter "Corrosion and its Control"
- sem 2: Retire topic "Inhibitors" in chapter "Corrosion and its Control"
- sem 2: Retire topic "Cathodic protection. Chemistry of Fuels: Origin" in chapter "Corrosion and its Control"
- sem 2: Retire topic "Classification and properties of Solid" in chapter "Corrosion and its Control"
- sem 2: Retire topic "Gaseous Fules" in chapter "Corrosion and its Control"
- sem 2: Retire topic "Proximate and Ultimate analysis" in chapter "Corrosion and its Control"
- sem 2: Retire topic "Petroleum- Distillation and Uses" in chapter "Corrosion and its Control"
- sem 2: Retire topic "Calorific Value" in chapter "Corrosion and its Control"
- sem 2: Retire topic "Determination of Calorific Value of solid and liquid fuels" in chapter "Corrosion and its Control"
- sem 2: Retire topic "Fuel Cell and Fuel Cell technology" in chapter "Corrosion and its Control"
- sem 2: Retire chapter "Cements" (12 topics) of pdeu-chemistry-theory-me
- sem 2: Retire chapter "Polymers" (6 topics) of pdeu-chemistry-theory-me
- sem 2: Retire pdeu-element-of-mechanical-engg "Element of Mechanical Engg." for me sem 2 (in no handout)
- sem 2: Retire pdeu-elements-of-electrical-engg "Elements of Electrical Engg." for me sem 2 (in no handout)
- sem 3: Retire chapter "Systems of linear equations" (10 topics) of pdeu-maths-iii
- sem 3: Retire chapter "Vector spaces" (8 topics) of pdeu-maths-iii
- sem 3: Retire chapter "Fourier Series" (13 topics) of pdeu-maths-iii
- sem 3: Retire topic "errors in measurements" in chapter "Fundamentals of measurement systems"
- sem 3: Retire topic "repeatability" in chapter "Fundamentals of measurement systems"
- sem 3: Retire topic "reproducibility" in chapter "Fundamentals of measurement systems"
- sem 3: Retire topic "sensitivity" in chapter "Fundamentals of measurement systems"
- sem 3: Retire topic "range and span" in chapter "Fundamentals of measurement systems"
- sem 3: Retire topic "hysteresis" in chapter "Fundamentals of measurement systems"
- sem 3: Retire topic "dead zone" in chapter "Fundamentals of measurement systems"
- sem 3: Retire topic "drift" in chapter "Fundamentals of measurement systems"
- sem 3: Retire topic "backlash" in chapter "Fundamentals of measurement systems"
- sem 3: Retire topic "dynamic characteristics in measurements" in chapter "Fundamentals of measurement systems"
- sem 3: Retire topic "Transfer Efficiency" in chapter "Fundamentals of measurement systems"
- sem 3: Retire topic "Intermediate Modifying Devices" in chapter "Fundamentals of measurement systems"
- sem 3: Retire topic "Advantages of Electrical Intermediate" in chapter "Fundamentals of measurement systems"
- sem 3: Retire topic "Electrical Intermediate Modifying Devices" in chapter "Fundamentals of measurement systems"
- sem 3: Retire topic "Terminating Devices" in chapter "Fundamentals of measurement systems"
- sem 3: Retire topic "Specifying Limits of Variability" in chapter "Inspection and quality control"
- sem 3: Retire topic "Dimensions and Tolerances" in chapter "Inspection and quality control"
- sem 3: Retire topic "Selection of Gauging Equipment" in chapter "Inspection and quality control"
- sem 3: Retire topic "Gauge Control" in chapter "Inspection and quality control"
- sem 3: Retire topic "Total Quality Management" in chapter "Inspection and quality control"
- sem 3: Retire topic "types of nanomaterial" in chapter "Inspection and quality control"
- sem 3: Retire topic "applications of nanotechnology" in chapter "Inspection and quality control"
- sem 3: Retire topic "techniques of nanometrology: transmission electron microscope" in chapter "Inspection and quality control"
- sem 3: Retire topic "scanning electron microscope" in chapter "Inspection and quality control"
- sem 3: Retire topic "atomic force microscope" in chapter "Inspection and quality control"
- sem 3: Retire topic "X- ray diffraction systems" in chapter "Inspection and quality control"
- sem 3: Retire pdeu-electrical-technology-and-control-systems "Electrical Technology and Control Systems" for me sem 3 (in no handout)
- sem 3: Retire pdeu-thermodynamics-and-fluid-flow "Thermodynamics and Fluid Flow" for me sem 3 (in no handout)
- sem 4: Retire topic "Introduction to machine design" in chapter "Unit 1"
- sem 4: Retire topic "Types of stresses" in chapter "Unit 1"
- sem 4: Retire topic "principle stress" in chapter "Unit 1"
- sem 4: Retire topic "Residual stresses" in chapter "Unit 1"
- sem 4: Retire topic "hertz contact stress. Design against static loading: Design of Cotter joint" in chapter "Unit 1"
- sem 4: Retire topic "Permanent vs temporary joints" in chapter "Unit 1"
- sem 4: Retire topic "Advantages and disadvantages of permanent joints" in chapter "Unit 1"
- sem 4: Retire topic "Materials for rivets" in chapter "Unit 1"
- sem 4: Retire topic "Weld Materials" in chapter "Unit 1"
- sem 4: Retire topic "Welded joint subjected to eccentric loading" in chapter "Unit 1"
- sem 4: Retire topic "Rigid vs. flexible couplings" in chapter "Design of Shafts"
- sem 4: Retire topic "design of screw with different types of threads used in practice" in chapter "Design of Shafts"
- sem 4: Retire topic "Design of nuts" in chapter "Design of Shafts"
- sem 4: Retire topic "Design of clamp" in chapter "Design of Shafts"
- sem 4: Retire topic "Screw jack" in chapter "Design of Shafts"
- sem 4: Retire topic "toggle jack" in chapter "Design of Shafts"
- sem 4: Retire topic "design of coupler" in chapter "Design of Shafts"
- sem 4: Retire topic "Design of Levers: Design of lever for safety valve" in chapter "Design of Shafts"
- sem 4: Retire topic "design of bell crank lever" in chapter "Design of Shafts"
- sem 4: Retire topic "Steering gear mechanisms" in chapter "Fundamentals of Kinematics and Mechanisms"
- sem 4: Retire topic "Hook’s joint. Cams: Introduction" in chapter "Fundamentals of Kinematics and Mechanisms"
- sem 4: Retire topic "Types of cams" in chapter "Fundamentals of Kinematics and Mechanisms"
- sem 4: Retire topic "Types of followers" in chapter "Fundamentals of Kinematics and Mechanisms"
- sem 4: Retire topic "Definitions" in chapter "Fundamentals of Kinematics and Mechanisms"
- sem 4: Retire topic "Follower displacement diagrams" in chapter "Fundamentals of Kinematics and Mechanisms"
- sem 4: Retire topic "High speed cams" in chapter "Fundamentals of Kinematics and Mechanisms"
- sem 4: Retire topic "Motions of follower" in chapter "Fundamentals of Kinematics and Mechanisms"
- sem 4: Retire topic "Layouts of cam profiles" in chapter "Fundamentals of Kinematics and Mechanisms"
- sem 4: Retire topic "Cams with specified contours" in chapter "Fundamentals of Kinematics and Mechanisms"
- sem 4: Retire topic "Analysis of cams" in chapter "Fundamentals of Kinematics and Mechanisms"
- sem 4: Retire topic "Velocity and Acceleration Analysis of Simple Mechanisms by relative velocity method and instantaneous centre method" in chapter "Unit 4"
- sem 4: Retire topic "Coriolis component of acceleration" in chapter "Unit 4"
- sem 4: Retire topic "Mechanical and structural errors" in chapter "Unit 4"
- sem 4: Retire topic "Branch defect and order defect" in chapter "Unit 4"
- sem 4: Retire topic "Graphical synthesis: Two and three position synthesis using relative pole method and inversion method for single slidercrank and four bar mechanism" in chapter "Unit 4"
- sem 4: Retire topic "Three position motion synthesis of four bar Mechanism" in chapter "Unit 4"
- sem 4: Retire topic "Destructive Tests: Tension Test- Engineering and True stress-strain curves" in chapter "Structure Property Relation"
- sem 4: Retire topic "their conversion relationships" in chapter "Structure Property Relation"
- sem 4: Retire topic "Numericals based on tension test, engineering stress" in chapter "Unit 2"
- sem 4: Retire topic "strain diagram for ductile and brittle materials, compression test. Hardness test" in chapter "Unit 2"
- sem 4: Retire topic "Brinell, Poldi, Vickers, Rockwell, Rockwell superficial" in chapter "Unit 2"
- sem 4: Retire topic "Micro hardness tests" in chapter "Unit 2"
- sem 4: Retire topic "Impact tests" in chapter "Unit 2"
- sem 4: Retire topic "Charpy and izod, fatigue and creep test, Erichsen cupping test, concept of fracture toughness testing" in chapter "Unit 2"
- sem 4: Retire topic "Introduction to Non Destructive Testing, visual inspection, dye penetration test, ultra sonic test" in chapter "Unit 2"
- sem 4: Retire topic "Introduction to powder metallurgy & applications: Non- ferrous metals and alloys- Copper and its alloys" in chapter "Heat Treatment"
- sem 4: Retire topic "Aluminium and its alloys" in chapter "Heat Treatment"
- sem 4: Retire chapter "Unit 4" (9 topics) of pdeu-engineering-metallurgy
- sem 4: Retire topic "Elasticity and plasticity" in chapter "SIMPLE STRESSES AND STRAINS"
- sem 4: Retire topic "Hooke’s law" in chapter "SIMPLE STRESSES AND STRAINS"
- sem 4: Retire topic "strain diagram for mild steel" in chapter "SIMPLE STRESSES AND STRAINS"
- sem 4: Retire topic "Lateral strain" in chapter "SIMPLE STRESSES AND STRAINS"
- sem 4: Retire topic "Poisson’s ratio and volumetric strain" in chapter "SIMPLE STRESSES AND STRAINS"
- sem 4: Retire topic "Elastic moduli and the relationship between them" in chapter "SIMPLE STRESSES AND STRAINS"
- sem 4: Retire topic "Bars of varying section" in chapter "SIMPLE STRESSES AND STRAINS"
- sem 4: Retire topic "composite bars" in chapter "SIMPLE STRESSES AND STRAINS"
- sem 4: Retire topic "Temperature stresses. STRAIN ENERGY: Resilience" in chapter "SIMPLE STRESSES AND STRAINS"
- sem 4: Retire topic "Gradual" in chapter "SIMPLE STRESSES AND STRAINS"
- sem 4: Retire topic "sudden" in chapter "SIMPLE STRESSES AND STRAINS"
- sem 4: Retire topic "impact and shock loadings" in chapter "SIMPLE STRESSES AND STRAINS"
- sem 4: Retire topic "simple applications. SHEAR FORCE AND BENDING MOMENT: Definition of beam" in chapter "SIMPLE STRESSES AND STRAINS"
- sem 4: Retire topic "Types of beams" in chapter "SIMPLE STRESSES AND STRAINS"
- sem 4: Retire topic "Concept of shear force and bending moment" in chapter "SIMPLE STRESSES AND STRAINS"
- sem 4: Retire topic "S.F and B.M diagrams for cantilever" in chapter "SIMPLE STRESSES AND STRAINS"
- sem 4: Retire topic "simply supported and overhanging beams subjected to point loads" in chapter "SIMPLE STRESSES AND STRAINS"
- sem 4: Retire topic "u.d.I" in chapter "SIMPLE STRESSES AND STRAINS"
- sem 4: Retire topic "Relation between S.F" in chapter "SIMPLE STRESSES AND STRAINS"
- sem 4: Retire topic "B.M and rate of loading at a section of a beam" in chapter "SIMPLE STRESSES AND STRAINS"
- sem 4: Retire topic "Shear stress distribution across various beam sections like rectangular" in chapter "FLEXURAL STRESSES"
- sem 4: Retire topic "triangular, |" in chapter "FLEXURAL STRESSES"
- sem 4: Retire topic "Double integration and Macaulay’s methods" in chapter "DEFLECTION OF BEAMS"
- sem 4: Retire topic "Determination of slope and deflection for cantilever and simply supported beams subjected to point loads" in chapter "DEFLECTION OF BEAMS"
- sem 4: Retire topic "U.D.L. Uniformly varying load.-Mohr’s theorems" in chapter "DEFLECTION OF BEAMS"
- sem 4: Retire topic "Moment area method" in chapter "DEFLECTION OF BEAMS"
- sem 4: Retire topic "application to simple cases including overhanging beams" in chapter "DEFLECTION OF BEAMS"
- sem 4: Retire topic "maximum principle strain theory" in chapter "DEFLECTION OF BEAMS"
- sem 4: Retire topic "max. strain energy theory- max . shear strain energy theory" in chapter "DEFLECTION OF BEAMS"
- sem 4: Retire topic "Torque" in chapter "TORSION"
- sem 4: Retire topic "Derivation and use of torque equation" in chapter "TORSION"
- sem 4: Retire topic "Power transmitted by shaft" in chapter "TORSION"
- sem 4: Retire topic "Concept of mean and maximum torque. COLUMNS & STRUTS: Buckling and Stability" in chapter "TORSION"
- sem 4: Retire topic "Columns with Pinned ends" in chapter "TORSION"
- sem 4: Retire topic "Columns with other support conditions" in chapter "TORSION"
- sem 4: Retire topic "Limitations of Euler’s Formula" in chapter "TORSION"
- sem 4: Retire topic "Rankine’s Formula" in chapter "TORSION"
- sem 4: Retire topic "Columns with eccentric Axial Loads" in chapter "TORSION"
- sem 4: Retire topic "Secant formula" in chapter "TORSION"
- sem 4: Retire pdeu-fluid-mechanics-and-fluid-machinery "Fluid Mechanics and Fluid Machinery" for me sem 4 (in no handout)
- sem 4: Retire pdeu-numerical-methods "Numerical Methods" for me sem 4 (in no handout)
- sem 5: Retire topic "Introduction to Mass Transfer: Fick’s law" in chapter "Heat Exchangers"
- sem 5: Retire topic "Analogy between heat and mass transfer" in chapter "Heat Exchangers"
- sem 5: Retire topic "Mass diffusion: mass and molar basis" in chapter "Heat Exchangers"
- sem 5: Retire topic "Diffusion through a stationary and moving medium" in chapter "Heat Exchangers"
- sem 5: Retire topic "determination of Inertia forces in connecting rods" in chapter "Static Force Analysis"
- sem 5: Retire topic "interference and under cutting" in chapter "Gears"
- sem 5: Retire topic "differential gear box" in chapter "Gears"
- sem 5: Retire topic "gear boxes-sliding and constant mesh gear box for automobiles. Gyroscope: Angular velocity" in chapter "Gears"
- sem 5: Retire topic "angular acceleration" in chapter "Gears"
- sem 5: Retire topic "gyroscopic torque" in chapter "Gears"
- sem 5: Retire topic "gyroscopic effect on naval ships and aeroplanes" in chapter "Gears"
- sem 5: Retire topic "stability of an automobile" in chapter "Gears"
- sem 5: Retire topic "two-wheel vehicle" in chapter "Gears"
- sem 5: Retire topic "rigid disc at an angle fixed to a rotating shaft" in chapter "Gears"
- sem 5: Retire topic "Analytical and graphical methods" in chapter "Brakes and Dynamometers"
- sem 5: Retire topic "displacement" in chapter "Vibration"
- sem 5: Retire topic "velocity and acceleration calculation" in chapter "Vibration"
- sem 5: Retire topic "types of damping" in chapter "Vibration"
- sem 5: Retire topic "resonance" in chapter "Vibration"
- sem 5: Retire topic "Whirling of shaft" in chapter "Vibration"
- sem 5: Retire topic "Torsional system" in chapter "Vibration"
- sem 5: Retire topic "Time domain and Frequency domain signal interpretation and applications" in chapter "Vibration"
- sem 5: Retire topic "classification of manufacturing processes" in chapter "Unit 1"
- sem 5: Retire topic "types of foundries" in chapter "Unit 1"
- sem 5: Retire topic "materials and allowances of pattern" in chapter "Unit 1"
- sem 5: Retire topic "ingredients of moulding sand and its properties" in chapter "Unit 1"
- sem 5: Retire topic "gating ratio" in chapter "Unit 1"
- sem 5: Retire topic "pressurized and un-pressurized gating" in chapter "Unit 1"
- sem 5: Retire topic "function of riser and its design. Introduction to cores" in chapter "Unit 1"
- sem 5: Retire topic "controlling of solidification direction" in chapter "Unit 1"
- sem 5: Retire topic "chaplets. Melting" in chapter "Unit 1"
- sem 5: Retire topic "shrinkage defects" in chapter "Unit 1"
- sem 5: Retire topic "porosity defects and metallurgical defects" in chapter "Unit 1"
- sem 5: Retire topic "remedies of defects" in chapter "Unit 1"
- sem 5: Retire topic "Classification of forming processes" in chapter "Unit 2"
- sem 5: Retire topic "bulk forming operations" in chapter "Unit 2"
- sem 5: Retire topic "sheet metal operations" in chapter "Unit 2"
- sem 5: Retire topic "basic metal working concepts and plasticity" in chapter "Unit 2"
- sem 5: Retire topic "cold and hot working" in chapter "Unit 2"
- sem 5: Retire topic "formability. Forging: Fundamentals" in chapter "Unit 2"
- sem 5: Retire topic "classifications of forging. Drop forging" in chapter "Unit 2"
- sem 5: Retire topic "roll forging" in chapter "Unit 2"
- sem 5: Retire topic "theory of rolling" in chapter "Unit 2"
- sem 5: Retire topic "types of rolling mills and products" in chapter "Unit 2"
- sem 5: Retire topic "forces in rolling and power requirements. Extrusion: Extrusion and its characteristics" in chapter "Unit 2"
- sem 5: Retire topic "hot and cold extrusion" in chapter "Unit 2"
- sem 5: Retire topic "forward and backward extrusion" in chapter "Unit 2"
- sem 5: Retire topic "impact extrusion" in chapter "Unit 2"
- sem 5: Retire topic "hydrostatic extrusion. Drawing: Drawing of wires" in chapter "Unit 2"
- sem 5: Retire topic "bars and tubes. Drawing forces and power. Sheet metal forming: Bending" in chapter "Unit 2"
- sem 5: Retire topic "spring back effect" in chapter "Unit 2"
- sem 5: Retire topic "explosive forming" in chapter "Unit 2"
- sem 5: Retire topic "sheet metal forming and magnetic — pulse forming" in chapter "Unit 2"
- sem 5: Retire topic "fluxes and coatings" in chapter "Welding and cutting"
- sem 5: Retire topic "types of weld joints" in chapter "Welding and cutting"
- sem 5: Retire topic "metallurgical characteristics of welded joints" in chapter "Welding and cutting"
- sem 5: Retire topic "destructive and non-destructive testing of welds" in chapter "Welding and cutting"
- sem 5: Retire topic "Introduction to tailor welded blanks" in chapter "Welding and cutting"
- sem 5: Retire topic "Introduction to cutting" in chapter "Welding and cutting"
- sem 5: Retire topic "classification of cutting" in chapter "Welding and cutting"
- sem 5: Retire topic "gas cutting and plasma cutting" in chapter "Welding and cutting"
- sem 5: Retire chapter "Unit 4" (29 topics) of pdeu-manufacturing-process-i
- sem 5: Retire pdeu-dept-elective-i-non-conventional-energy-sources-course "Dept. Elective - I (Non-Conventional Energy Sources)" for me sem 5 (in no handout)
- sem 6: Retire topic "Industry Best Practices. Demand management and forecasting: Introduction" in chapter "Operations Management"
- sem 6: Retire topic "The Strategic Importance of Forecasting" in chapter "Operations Management"
- sem 6: Retire topic "Benefits" in chapter "Operations Management"
- sem 6: Retire topic "Cost implications and Decision making using forecasting" in chapter "Operations Management"
- sem 6: Retire topic "Classification of Forecasting Process" in chapter "Operations Management"
- sem 6: Retire topic "components of demand Forecasting and Product Life Cycle" in chapter "Operations Management"
- sem 6: Retire topic "Selection of the Forecasting Method" in chapter "Operations Management"
- sem 6: Retire topic "historical analogy" in chapter "Operations Management"
- sem 6: Retire topic "Delphi method and other methods" in chapter "Operations Management"
- sem 6: Retire topic "Quantitative Methods" in chapter "Operations Management"
- sem 6: Retire topic "web-based forecasting: collaborative planning" in chapter "Operations Management"
- sem 6: Retire topic "forecasting and replenishments. Associative Models of Forecasting" in chapter "Operations Management"
- sem 6: Retire topic "Accuracy of Forecasting" in chapter "Operations Management"
- sem 6: Retire topic "purposes of inventory" in chapter "Operations Management"
- sem 6: Retire topic "independent vs dependent demand" in chapter "Operations Management"
- sem 6: Retire topic "fixed order quantity models and fixed time period models" in chapter "Operations Management"
- sem 6: Retire topic "ABC inventory planning" in chapter "Operations Management"
- sem 6: Retire topic "inventory accuracy and cycle" in chapter "Operations Management"
- sem 6: Retire topic "price break models" in chapter "Operations Management"
- sem 6: Retire topic "reorder point" in chapter "Operations Management"
- sem 6: Retire topic "safety stock" in chapter "Operations Management"
- sem 6: Retire topic "the Newsboy problem" in chapter "Operations Management"
- sem 6: Retire topic "case studies in inventory control" in chapter "Operations Management"
- sem 6: Retire topic "case studies on MRP" in chapter "Operations Management"
- sem 6: Retire topic "Purpose of Operations Scheduling" in chapter "Operations Scheduling"
- sem 6: Retire topic "Factors Considered while Scheduling" in chapter "Operations Scheduling"
- sem 6: Retire topic "Scheduling Activity under Production Planning and Control" in chapter "Operations Scheduling"
- sem 6: Retire topic "Scheduling Strategies" in chapter "Operations Scheduling"
- sem 6: Retire topic "Scheduling Guidelines" in chapter "Operations Scheduling"
- sem 6: Retire topic "Approaches to Scheduling" in chapter "Operations Scheduling"
- sem 6: Retire topic "Scheduling Methodology [Quantitative]" in chapter "Operations Scheduling"
- sem 6: Retire topic "Scheduling in Services" in chapter "Operations Scheduling"
- sem 6: Retire topic "customer arrival" in chapter "Operations Scheduling"
- sem 6: Retire topic "distribution of arrivals" in chapter "Operations Scheduling"
- sem 6: Retire topic "M/G/1" in chapter "Operations Scheduling"
- sem 6: Retire topic "M/M/S and their corresponding derivations to measure various quantities such as length of queue" in chapter "Operations Scheduling"
- sem 6: Retire topic "length of system" in chapter "Operations Scheduling"
- sem 6: Retire topic "average waiting time in queue and in system" in chapter "Operations Scheduling"
- sem 6: Retire topic "probability of waiting in line" in chapter "Operations Scheduling"
- sem 6: Retire topic "objectives of the layout" in chapter "Facility planning"
- sem 6: Retire topic "types of layouts" in chapter "Facility planning"
- sem 6: Retire topic "quality specification" in chapter "Facility planning"
- sem 6: Retire topic "statistical quality control" in chapter "Facility planning"
- sem 6: Retire topic "acceptance sampling" in chapter "Facility planning"
- sem 6: Retire topic "AQL" in chapter "Facility planning"
- sem 6: Retire topic "LTPD" in chapter "Facility planning"
- sem 6: Retire topic "OC curves. Six-sigma quality" in chapter "Facility planning"
- sem 6: Retire topic "six-sigma methodology" in chapter "Facility planning"
- sem 6: Retire topic "process control procedures" in chapter "Facility planning"
- sem 6: Retire topic "lean implementation requirements" in chapter "Facility planning"
- sem 6: Retire topic "lean layout and design flow" in chapter "Facility planning"
- sem 6: Retire topic "lean applications for line flow" in chapter "Facility planning"
- sem 6: Retire topic "lean services" in chapter "Facility planning"
- sem 6: Retire chapter "Unit 4" (23 topics) of pdeu-production-operation-management
- sem 6: Retire topic "Ideal refrigeration cycles" in chapter "Introduction"
- sem 6: Retire topic "effects of sub cooling and super heating" in chapter "Introduction"
- sem 6: Retire topic "Working of expansion valves like capillary tube, automatic, and thermostatic expansion valve" in chapter "Introduction"
- sem 6: Retire topic "principle and operation of vortex tube" in chapter "Refrigerants"
- sem 6: Retire topic "calculation of ADP with the help of the chart" in chapter "Psychometric & Human Comfort"
- sem 6: Retire chapter "Air Conditioning" (5 topics) of pdeu-refrigeration-and-air-conditioning
- sem 6: Retire topic "pipes and pipe flanges for pipe joints" in chapter "Design of Pressure Vessels"
- sem 6: Retire topic "machining requirements. Introduction to machine tools" in chapter "Introduction and machine tool drives"
- sem 6: Retire topic "functional principles" in chapter "Introduction and machine tool drives"
- sem 6: Retire topic "role and forms of kinematic structure in machine tools" in chapter "Introduction and machine tool drives"
- sem 6: Retire topic "methods of changing speed and feed in machine tools" in chapter "Introduction and machine tool drives"
- sem 6: Retire topic "design of speed gear box of machine tools" in chapter "Introduction and machine tool drives"
- sem 6: Retire topic "classification of machine tools. Single point cutting tool: Working and auxiliary motions" in chapter "Introduction and machine tool drives"
- sem 6: Retire topic "importance of chips" in chapter "Introduction and machine tool drives"
- sem 6: Retire topic "mechanism of chip formation" in chapter "Introduction and machine tool drives"
- sem 6: Retire topic "mechanics of machining" in chapter "Introduction and machine tool drives"
- sem 6: Retire topic "use of chip breakers" in chapter "Introduction and machine tool drives"
- sem 6: Retire topic "orthogonal and oblique cutting. Purpose of cutting fluids" in chapter "Introduction and machine tool drives"
- sem 6: Retire topic "essential properties of cutting fluids" in chapter "Introduction and machine tool drives"
- sem 6: Retire topic "types of cutting fluids and their application" in chapter "Introduction and machine tool drives"
- sem 6: Retire topic "cutting speed, feed and depth of cut" in chapter "Lathe"
- sem 6: Retire topic "material removal rate, cutting power, specific energy and machining time" in chapter "Lathe"
- sem 6: Retire topic "Tool and job holders in lathes" in chapter "Lathe"
- sem 6: Retire topic "twist drill" in chapter "Lathe"
- sem 6: Retire topic "deep hole drilling machines. Boring machines and classifications" in chapter "Lathe"
- sem 6: Retire topic "gear cutting methods. Grinding: Introduction" in chapter "Milling machine"
- sem 6: Retire topic "differences between machining and grinding" in chapter "Milling machine"
- sem 6: Retire topic "basic principles, methods and applications of grinding" in chapter "Milling machine"
- sem 6: Retire topic "grinding requirements" in chapter "Milling machine"
- sem 6: Retire topic "selection of grinding wheel" in chapter "Milling machine"
- sem 6: Retire topic "faults in grinding" in chapter "Milling machine"
- sem 6: Retire topic "Super abrasive wheels and their bonds" in chapter "Milling machine"
- sem 6: Retire topic "Super finishing: Purpose and order of super finishing" in chapter "Milling machine"
- sem 6: Retire topic "micro and super finishing methods" in chapter "Milling machine"
- sem 6: Retire topic "characteristics and applications" in chapter "Milling machine"
- sem 6: Retire topic "lapping" in chapter "Milling machine"
- sem 6: Retire topic "honing" in chapter "Milling machine"
- sem 6: Retire topic "super finishing" in chapter "Milling machine"
- sem 6: Retire topic "burnishing" in chapter "Milling machine"
- sem 6: Retire topic "polishing" in chapter "Milling machine"
- sem 6: Retire topic "magnetic float polishing" in chapter "Milling machine"
- sem 6: Retire topic "magnetic field assisted polishing" in chapter "Milling machine"
- sem 6: Retire topic "electro polishing" in chapter "Milling machine"
- sem 6: Retire chapter "Jigs and Fixtures" (10 topics) of pdeu-manufacturing-process-ii
- sem 6: Retire topic "Classification of robots" in chapter "Introduction"
- sem 6: Retire topic "basic robot components" in chapter "Introduction"
- sem 6: Retire topic "manipulator end effectors" in chapter "Introduction"
- sem 6: Retire topic "controller" in chapter "Introduction"
- sem 6: Retire topic "power unit" in chapter "Introduction"
- sem 6: Retire topic "sensing devices" in chapter "Introduction"
- sem 6: Retire topic "specification of robot systems" in chapter "Introduction"
- sem 6: Retire topic "accuracy precision and repeatability" in chapter "Introduction"
- sem 6: Retire topic "work envelop" in chapter "Introduction"
- sem 6: Retire topic "wrist analysis" in chapter "Introduction"
- sem 6: Retire topic "Parameters of robot link" in chapter "Kinematics and Dynamics"
- sem 6: Retire topic "formulation of D-H matrix" in chapter "Kinematics and Dynamics"
- sem 6: Retire topic "Analysis of different types of robots with different degrees of freedom" in chapter "Kinematics and Dynamics"
- sem 6: Retire topic "kinematic chains" in chapter "Kinematics and Dynamics"
- sem 6: Retire topic "Dynamic analysis" in chapter "Kinematics and Dynamics"
- sem 6: Retire topic "Different trajectories and its analysis" in chapter "Motion planning"
- sem 6: Retire topic "velocity and acceleration sensors" in chapter "Motion planning"
- sem 6: Retire topic "proximity and range sensors" in chapter "Motion planning"
- sem 6: Retire topic "touch and slip sensors" in chapter "Motion planning"
- sem 6: Retire topic "tactile sensors" in chapter "Motion planning"
- sem 6: Retire topic "force sensors and torque sensors" in chapter "Motion planning"
- sem 6: Retire chapter "Robotic vision system" (8 topics) of pdeu-robotics
- sem 6: Retire chapter "Industry 4.0" (4 topics) of pdeu-robotics
- sem 6: Retire pdeu-dept-elective-ii-advance-manufacturing-process "Dept. Elective - II (Advance Manufacturing Process)" for me sem 6 (in no handout)
- sem 7: Retire topic "Design of worm gear set" in chapter "18"
- sem 7: Retire topic "vehicle motion resistance" in chapter "08"
- sem 7: Retire topic "Epicyclic gear box" in chapter "08"
- sem 7: Retire topic "sheaves" in chapter "14"
- sem 7: Retire topic "drums" in chapter "14"
- sem 7: Retire topic "grab buckets and cranes" in chapter "14"
- sem 7: Retire topic "Computer Graphics: Scan conversion" in chapter "CAD Fundamentals"
- sem 7: Retire topic "shear and reflection" in chapter "Geometric Transformations"
- sem 7: Retire topic "Types of mathematical representation of curves" in chapter "Plane & Space Curves"
- sem 7: Retire topic "parametric representation of line" in chapter "Plane & Space Curves"
- sem 7: Retire topic "parabola" in chapter "Plane & Space Curves"
- sem 7: Retire topic "hyperbola. Wire frame models" in chapter "Plane & Space Curves"
- sem 7: Retire topic "wire frame entities" in chapter "Plane & Space Curves"
- sem 7: Retire topic "Beams. Computer Programming: Use of computer programming in design of machine elements" in chapter "Finite Element Method"
- sem 7: Retire topic "development of computer program using Matlab for machine components like shaft" in chapter "Finite Element Method"
- sem 7: Retire topic "spring" in chapter "Finite Element Method"
- sem 7: Retire topic "gears" in chapter "Finite Element Method"
- sem 7: Retire topic "bearing etc" in chapter "Finite Element Method"
- sem 7: Retire topic "plotting graphs using programming language" in chapter "Finite Element Method"
- sem 7: Retire topic "generalized programming" in chapter "Finite Element Method"
- sem 7: Retire topic "optimization in design" in chapter "Finite Element Method"
- sem 7: Retire pdeu-discipline-based-generic-optimization-techniques "Discipline based / Generic (Optimization Techniques)" for me sem 7 (in no handout)
- sem 7: Retire pdeu-internal-combustion-engine "Internal Combustion Engine" for me sem 7 (in no handout)

</details>

### petro

<details><summary>new practical course (17)</summary>

- sem 1: Add lab "Computer Programming-I Laboratory" (9 experiments), related to Computer Programming – I
- sem 1: Add lab "Modern Physics Laboratory" (15 experiments), related to Modern Physics
- sem 1: Add lab "Workshop Practices" (10 experiments)
- sem 1: Add lab "Geology for Petroleum Engineers Laboratory" (13 experiments), related to Geology for Petroleum Engineers
- sem 2: Add lab "Computer Programming-II Laboratory" (8 experiments), related to Computer Programming – II
- sem 2: Add lab "Chemistry Laboratory" (14 experiments), related to Chemistry
- sem 2: Add lab "Sedimentary and Petroleum Geology Laboratory" (9 experiments), related to Sedimentary and Petroleum Geology
- sem 3: Add lab "Geomechanics and Strength of Materials Practical" (9 experiments), related to Geomechanics and Strength of Materials
- sem 3: Add lab "Petroleum Exploration Laboratory" (11 experiments), related to Petroleum Exploration
- sem 4: Add lab "Industrial 4.0 Laboratory" (13 experiments)
- sem 4: Add lab "Drilling Engineering Laboratory" (14 experiments), related to Drilling Engineering
- sem 4: Add lab "Earth Science and Hydrocarbon Exploration Field Work" (0 experiments)
- sem 5: Add lab "Introduction to Petroleum Software Laboratory" (14 experiments)
- sem 5: Add lab "Petroleum Engineering – I Laboratory" (13 experiments)
- sem 6: Add lab "Petroleum Engineering – II Laboratory" (13 experiments)
- sem 6: Add lab "Petroleum Product Testing Laboratory" (13 experiments)
- sem 7: Add lab "Reservoir Engineering Software Laboratory" (14 experiments)

</details>

<details><summary>unit rename (8)</summary>

- sem 2: Rename chapter "Unit 1" to "Unit 1"
- sem 2: Rename chapter "Unit 2" to "Unit 2"
- sem 2: Rename chapter "Unit 3" to "Unit 3"
- sem 2: Rename chapter "Unit 4" to "Unit 4"
- sem 7: Rename chapter "Unit 1" to "Unit 1"
- sem 7: Rename chapter "Unit 2" to "Unit 2"
- sem 7: Rename chapter "Unit 3" to "Unit 3"
- sem 7: Rename chapter "Unit 4" to "Unit 4"

</details>

<details><summary>topic under wrong unit (3)</summary>

- sem 5: Move topic "OISD" from chapter "HSE Management System" to "Hazard And Risk Analysis"
- sem 5: Move topic "API RP 75" from chapter "HSE Management System" to "Hazard And Risk Analysis"
- sem 6: Move topic "Introduction to Offshore" from chapter "Shallow and Deep-Water Development" to "Offshore Well Completion and Production System"

</details>

<details><summary>topic missing (45)</summary>

- sem 1: Add topic "Thermal Pollution" to chapter "Multi-Scale Environmental Pollution (Global, Regional and Local)"
- sem 1: Add topic "Radioactive Pollution" to chapter "Multi-Scale Environmental Pollution (Global, Regional and Local)"
- sem 1: Add topic "Igneous Petrologyrock cycle" to chapter "Mineralogy And Petrology"
- sem 2: Add topic "Cauchy and Legendre's linear equations" to chapter "Ordinary Differential Equations with Applications"
- sem 2: Add topic "Linear differential equations of second order with variable coefficients" to chapter "Ordinary Differential Equations with Applications"
- sem 2: Add topic "Biologically important organic compounds, Carbohydrate, Lipids, Proteins" to chapter "Organic Geochemistry and Isotope Geochemistry"
- sem 2: Add topic "Porosity-permeability trends in reservoirs formed in Continental (Alluvial Fan" to chapter "Unit 2"
- sem 2: Add topic "Fluvial System-Meandering and Braided)" to chapter "Unit 2"
- sem 4: Add topic "computational processing" to chapter "Introduction and Basic Concepts of Industry 4.: 08"
- sem 4: Add topic "Rw calculation and its use in determining SW" to chapter "SP, GR and Resistivity Logs"
- sem 4: Add topic "Porosity and lithology estimations (Neutron-Density, SonicDensity" to chapter "Porosity Logs- Density, Neutron, Sonic and NMR"
- sem 5: Add topic "Risk Matrix" to chapter "Hazard And Risk Analysis"
- sem 5: Add topic "HAZID" to chapter "Hazard And Risk Analysis"
- sem 5: Add topic "Safe Work Practices: PTW" to chapter "Hazard And Risk Analysis"
- sem 5: Add topic "MOC" to chapter "Hazard And Risk Analysis"
- sem 5: Add topic "Electrical Safety" to chapter "Hazard And Risk Analysis"
- sem 5: Add topic "Investigation techniques Emergency Response planning Audits & Inspection" to chapter "Hazard And Risk Analysis"
- sem 6: Add topic "Precombustion capture" to chapter "Introduction to Carbon Capture, Utilization and Storage"
- sem 6: Add topic "Technoeconomic evaluation of projects" to chapter "Monitoring, Risk Assessment and Techno-economic evaluation"
- sem 6: Add topic "Representative Elementary Volume (REV)" to chapter "Introduction"
- sem 6: Add topic "Property upscaling" to chapter "Introduction"
- sem 6: Add topic "Rock and fluid properties" to chapter "Introduction"
- sem 6: Add topic "PVT models" to chapter "Introduction"
- sem 6: Add topic "Conservation of Mass and Momentum" to chapter "Introduction"
- sem 6: Add topic "Reservoir Model Solution Techniques: Implicit pressure and Explicit Saturation (IMPES)" to chapter "Reservoir Model Solution Algorithms"
- sem 6: Add topic "flexible risers: configuration and laying techniques" to chapter "Offshore Well Completion and Production System"
- sem 6: Add topic "Offshore production system: Fixed, floating, subsea" to chapter "Offshore Well Completion and Production System"
- sem 6: Add topic "Commercial value and Environmental impacts" to chapter "Oil-Shale, Shale Gas, and Tar Sand"
- sem 6: Add topic "processes leading to maximization of shale oil production" to chapter "Oil-Shale, Shale Gas, and Tar Sand"
- sem 6: Add topic "Marcellus shale gas project" to chapter "Oil-Shale, Shale Gas, and Tar Sand"
- sem 6: Add topic "methods of recovery of bitumen by mining and advanced in-situ processes" to chapter "Oil-Shale, Shale Gas, and Tar Sand"
- sem 6: Add topic "typical conditions of methane hydrate formation in nature vis-à vis different gas hydrate stability zones" to chapter "Gas Hydrate"
- sem 6: Add topic "physical properties of hydrates and ice" to chapter "Gas Hydrate"
- sem 6: Add topic "geology of methane hydrates" to chapter "Gas Hydrate"
- sem 6: Add topic "exploration for methane hydrates, geological, geochemical, geophysical" to chapter "Gas Hydrate"
- sem 7: Add topic "Corrosivity of aqueous phase in hydrocarbon fluids, Sulphur" to chapter "Fundamentals of Corrosion"
- sem 7: Add topic "H2S in hydrocarbon fluids" to chapter "Fundamentals of Corrosion"
- sem 7: Add topic "Significance of H2S" to chapter "Forms of Corrosion"
- sem 7: Add topic "Biocides Max <>" to chapter "Pipeline Corrosion and Its Prevention"
- sem 7: Add topic "Selfhealing and smart cement systems" to chapter "Nanotechnology Applications in Drilling, Cementing, and Reservoir"
- sem 7: Add topic "Natural gas trend" to chapter "Petroleum and Natural Gas Regulatory Bodies"
- sem 7: Add topic "Technical Standards and Specifications including Safety Standards (T4S)" to chapter "Petroleum and Natural Gas Regulatory Bodies"
- sem 7: Add topic "Sand Control Techniques Reasons" to chapter "Workover and Well Stimulation Techniques"
- sem 7: Add topic "Data validation and workflow development for reservoir characterization" to chapter "Concept Reservoir Management & Characterization"
- sem 7: Add topic "Displacement efficiency in different system, linear, areal, volumetric" to chapter "Enhanced Oil Recovery Methods"

</details>

<details><summary>topic split (211)</summary>

- sem 1: Split topic "Definition Evaluation of double integral (Cartesian - Polar form) –Change of orders" into "Definition Evaluation of double integral (Cartesian", "Polar form) –Change of orders" (first keeps id double-integrals)
- sem 1: Split topic "Rank of a matrix, consistency of system of equation" into "Rank of a matrix", "consistency of system of equation" (first keeps id rank-of-matrix)
- sem 1: Split topic "Simple problems on line, surface and volume integrals" into "Simple problems on line", "surface and volume integrals" (first keeps id line-integrals)
- sem 1: Split topic "Green’s theorem in a plane, Gauss divergence theorem and Stokes’ theorem (without proofs)" into "Green’s theorem in a plane", "Gauss divergence theorem and Stokes’ theorem (without proofs)" (first keeps id divergence-theorem)
- sem 1: Split topic "go to statement. Loop control structures- while" into "go to statement", "Loop control structures- while" (first keeps id go-to-statement-loop-control-structures-while)
- sem 1: Split topic "Array Manipulations. Matrix operations" into "Array Manipulations", "Matrix operations" (first keeps id array-manipulations-matrix-operations)
- sem 1: Split topic "Pointer" into "Pointer arithmetic", "Pointer to pointer" (first keeps id pointer)
- sem 1: Split topic "Engineering Physics related applications. Davisson Germer experiment" into "Engineering Physics related applications", "Davisson Germer experiment" (first keeps id engineering-physics-related-applications-davisson-germer)
- sem 1: Split topic "Physical and mathematical concepts of gradient, divergence and curl, Gauss theorem, applications in gravitation and electrostatics" into "Physical and mathematical concepts of gradient", "divergence and curl", "Gauss theorem", "applications in gravitation and electrostatics" (first keeps id gradient-divergence-curl)
- sem 1: Split topic "Equation of continuity, Biot Savart law" into "Equation of continuity", "Biot Savart law" (first keeps id biot-savart-law)
- sem 1: Split topic "magnetization and magnetic intensity, Faraday’s law of Maxwell’s equations, wave equation for electromagnetic radiation, applications of optical fibers in communication" into "magnetization and magnetic intensity", "Faraday’s law of Maxwell’s equations", "wave equation for electromagnetic radiation", "applications of optical fibers in communication" (first keeps id maxwells-equations)
- sem 1: Split topic "Introduction to BCS Theory. Concepts of LASER" into "Introduction to BCS Theory", "Concepts of LASER" (first keeps id introduction-to-bcs-theory-concepts-of-laser)
- sem 1: Split topic "Sustainable Development" into "Sustainable Development", "Sustainable Development Goals" (first keeps id sustainable-development)
- sem 1: Split topic "Its importance and Multidisciplinary nature, Introduction to Environmental Parameters and their standards (air, water, soil, noise, etc.)" into "Its importance and Multidisciplinary nature", "Introduction to Environmental Parameters and their standards (air, water, soil, noise, etc.)" (first keeps id its-importance-and-multidisciplinary-nature-introduction-to)
- sem 1: Split topic "Ecosystem and its types, Ideal ecosystem, Biodiversity : Its importance and conservation" into "Ecosystem and its types", "Ideal ecosystem", "Biodiversity : Its importance and conservation" (first keeps id ecosystem-and-its-types-ideal-ecosystem-biodiversity-its)
- sem 1: Split topic "Pollution, Causes and Effects of different types of pollution : Air Pollution, Water Pollution, Soil Pollution, Solid Waste (organic and Inorganic) Pollution, Hazardous Waste Pollution, Marine Polluti" into "Pollution, Causes and Effects of different types of pollution : Air Pollution", "Water Pollution", "Soil Pollution", "Solid Waste (organic and Inorganic) Pollution", "Hazardous Waste Pollution", "Marine Pollution" (first keeps id pollution-causes-and-effects-of-different-types-of-pollution)
- sem 1: Split topic "Introduction to man-made disasters like floods, heat waves, landslides, etc., Introduction to the various instruments for measuring air pollution, water pollution, noise, etc" into "Noise Pollution", "Introduction to man-made disasters like floods", "heat waves, landslides, etc", "Introduction to the various instruments for measuring air pollution", "water pollution, noise" (first keeps id introduction-to-man-made-disasters-like-floods-heat-waves)
- sem 1: Split topic "Origin of the solar system with earth formation - stellar nucleosynthesis" into "Origin of the solar system with earth formation", "stellar nucleosynthesis" (first keeps id origin-of-the-solar-system-with-earth-formation-stellar)
- sem 1: Split topic "The Earth's structure - crust, mantle and core" into "The Earth's structure, crust", "mantle and core" (first keeps id the-earths-structure-crust-mantle-and-core)
- sem 1: Split topic "Plate tectonics and basin formation. Geological time scale" into "Plate tectonics and basin formation", "Geological time scale" (first keeps id plate-tectonics-petro)
- sem 1: Split topic "radioactive dating. Sea level change" into "radioactive dating", "Sea level change" (first keeps id radioactive-dating-sea-level-change)
- sem 1: Split topic "Biological weathering. Stress and strain in rocks" into "Biological weathering", "Stress and strain in rocks" (first keeps id biological-weathering-stress-and-strain-in-rocks)
- sem 1: Split topic "chemical mineralogy, Bio mineralogy, Optical mineralogy" into "chemical mineralogy", "Bio mineralogy", "Optical mineralogy" (first keeps id chemical-mineralogy-bio-mineralogy-optical-mineralogy)
- sem 1: Split topic "Bowen’s reaction series, Formation of igneous rocks, Classification of igneous rocks, Texture of igneous rocks, Sedimentary rocks formation" into "Bowen’s reaction series", "Formation of igneous rocks", "Texture of igneous rocks", "Sedimentary rocks formation" (first keeps id bowens-reaction-series-formation-of-igneous-rocks)
- sem 1: Split topic "classification of sandstone, Folk's textural classification of carbonate sediments" into "classification of sandstone", "Folk's textural classification of carbonate sediments" (first keeps id classification-of-sandstone-folks-textural-classification-of)
- sem 1: Split topic "Formation of metamorphic rocks, Foliated rocks, and Non-foliated rocks" into "Formation of metamorphic rocks", "Foliated rocks", "Non-foliated rocks" (first keeps id formation-of-metamorphic-rocks-foliated-rocks-and-non)
- sem 1: Split topic "Laws of Stratigraphy" into "Stratigraphy-Types of Stratigraphy", "Laws of Stratigraphy, Unconformities" (first keeps id laws-of-stratigraphy)
- sem 1: Split topic "understanding material (physical facilities) and spiritual needs - need of mind and body" into "understanding material (physical facilities) and spiritual needs", "need of mind and body" (first keeps id understanding-material-physical-facilities-and-spiritual)
- sem 2: Split topic "Rank of a matrix, consistency of system of equation" into "Rank of a matrix", "consistency of system of equation" (first keeps id rank-of-matrix)
- sem 2: Split topic "Differential equations of the first order and higher degree, Higher-order differential equations with constant coefficients, Rules for finding C.F. and P.I., Method of variation of parameters, Cauchy " into "Differential equations of the first order and higher degree", "Higher-order differential equations with constant coefficients", "Rules for finding C.F. and P.I", "Method of variation of parameters" (first keeps id higher-order-linear-ode)
- sem 2: Split topic "Simultaneous linear equations with constant coefficients, applications of higher-order differential equations in solving engineering problems" into "Simultaneous linear equations with constant coefficients", "applications of higher-order differential equations in solving engineering problems" (first keeps id simultaneous-linear-equations-with-constant-coefficients)
- sem 2: Split topic "Comparison with other programming languages. Python IDEs Tokens: Identifiers" into "Comparison with other programming languages", "Python IDEs Tokens: Identifiers" (first keeps id comparison-with-other-programming-languages-python-ides)
- sem 2: Split topic "elif and else" into "elif and else, nesting", "for else and while else" (first keeps id elif-and-else)
- sem 2: Split topic "Decorator function" into "Decorator function", "Decorator chaining Generator function" (first keeps id decorator-function)
- sem 2: Split topic "Surface Chemistry: Interparticle forces, adsorption isotherms, determination of the surface area of fine powders using BET theory, surface films" into "Surface Chemistry: Interparticle forces", "adsorption isotherms", "determination of the surface area of fine powders using BET theory", "surface films" (first keeps id surface-chemistry-interparticle-forces-adsorption-isotherms)
- sem 2: Split topic "Colligative Properties and their Experimental Determination: Boiling Point Elevation, Freezing Point depression, Osmotic Pressure" into "Colligative Properties and their Experimental Determination: Boiling Point Elevation", "Freezing Point depression", "Osmotic Pressure" (first keeps id colligative-properties-and-their-experimental-determination)
- sem 2: Split topic "Coal" into "Analysis of coal", "Coal and its environment" (first keeps id coal)
- sem 2: Split topic "fluidized bed combustion and coke. Liquid Fuels: Diesel Engine" into "fluidized bed combustion and coke", "Liquid Fuels: Diesel Engine" (first keeps id fluidized-bed-combustion-and-coke-liquid-fuels-diesel-engine)
- sem 2: Split topic "flash point" into "flash point", "fire point and smoke point" (first keeps id flash-point)
- sem 2: Split topic "gasoline fuel. Gaseous fuel: Natural gas and its uses" into "gasoline fuel", "Gaseous fuel: Natural gas and its uses" (first keeps id gasoline-fuel-gaseous-fuel-natural-gas-and-its-uses)
- sem 2: Split topic "other carbon based fuel gases, and explosion limits. Hydrogen" into "other carbon based fuel gases", "explosion limits, Hydrogen" (first keeps id other-carbon-based-fuel-gases-and-explosion-limits-hydrogen)
- sem 2: Split topic "A brief Biological background, Organic Compound and their nomenclature, Biologically important organic compounds" into "A brief Biological background", "Organic Compound and their nomenclature" (first keeps id a-brief-biological-background-organic-compound-and-their)
- sem 2: Split topic "Basins and formation of sediments, Grain transportation and its deposition, Hjoulstorm curve, Sediment texture (Size, Shape, sorting)" into "Basins and formation of sediments", "Grain transportation and its deposition", "Hjoulstorm curve", "Sediment texture (Size, Shape", "sorting)" (first keeps id basins-and-formation-of-sediments-grain-transportation-and)
- sem 2: Split topic "Paleocurrent analysis, diagenesis, fundamentals of fluid flow (Reynolds no; Froude no.)" into "Paleocurrent analysis, diagenesis", "fundamentals of fluid flow (Reynolds no", "Froude no.)" (first keeps id paleocurrent-analysis-diagenesis-fundamentals-of-fluid-flow)
- sem 2: Split topic "Flow Regimes (Upper flow regime; Lower flow regime)" into "Flow Regimes (Upper flow regime", "Lower flow regime)" (first keeps id flow-regimes-upper-flow-regime-lower-flow-regime)
- sem 2: Split topic "Bedforms formed under unidirectional flow" into "Bedforms formed under unidirectional flow", "Bedforms formed under Oscillatory flow" (first keeps id bedforms-formed-under-unidirectional-flow)
- sem 2: Split topic "Kerogen and its types, Maturation of Kerogene, Thermal maturity indicators, Migration of Hydrocarbons" into "Kerogen and its types", "Maturation of Kerogene", "Thermal maturity indicators", "Migration of Hydrocarbons" (first keeps id kerogen-and-its-types-maturation-of-kerogene-thermal)
- sem 2: Split topic "effect of isopotential surfaces, identifying migration pathways" into "effect of isopotential surfaces", "identifying migration pathways" (first keeps id effect-of-isopotential-surfaces-identifying-migration)
- sem 2: Split topic "Traps (Structural; Stratigraphic and combined traps)" into "Traps (Structural", "Stratigraphic and combined traps)" (first keeps id petroleum-traps)
- sem 2: Split topic "Mumbai-High (b) Clastic reservoir: Assam, Cambay (c) Evaporitic reservoir: Bikaner-Nagur Basin" into "Mumbai-High (b) Clastic reservoir: Assam", "Cambay (c) Evaporitic reservoir: Bikaner-Nagur Basin" (first keeps id mumbai-high-b-clastic-reservoir-assam-cambay-c-evaporitic)
- sem 2: Split topic "Pañcāṅga – The Indian calendar system" into "Pañcāṅga", "The Indian calendar system" (first keeps id pancanga-the-indian-calendar-system)
- sem 2: Split topic "IKS and Medicine: Ayurveda - A Holistic Approach to Health and Wellbeing" into "IKS and Medicine: Ayurveda", "A Holistic Approach to Health and Wellbeing Max <>" (first keeps id iks-and-medicine-ayurveda-a-holistic-approach-to-health-and)
- sem 2: Split topic "Definition and scope of organization, behaviour, and organizational behaviour" into "Definition and scope of organization, behaviour", "organizational behaviour" (first keeps id definition-and-scope-of-organization-behaviour-and)
- sem 2: Split topic "power dynamics, and organizational politics" into "power dynamics", "organizational politics" (first keeps id power-dynamics-and-organizational-politics)
- sem 2: Split topic "Proposal writing (Project, Research and Business)" into "Proposal writing (Project", "Research and Business)" (first keeps id proposal-writing-project-research-and-business)
- sem 3: Split topic "frequency shifting, and convolution properties" into "frequency shifting", "convolution properties" (first keeps id frequency-shifting-and-convolution-properties)
- sem 3: Split topic "communication systems, and quantum mechanics" into "communication systems", "quantum mechanics" (first keeps id communication-systems-and-quantum-mechanics)
- sem 3: Split topic "wave equation, and Laplace equation" into "wave equation", "Laplace equation" (first keeps id wave-equation-and-laplace-equation)
- sem 3: Split topic "Machine Learning (ML) vs. Deep Learning (DL)" into "Machine Learning (ML) vs", "Deep Learning (DL)" (first keeps id machine-learning-ml-vs-deep-learning-dl)
- sem 3: Split topic "Supervised Learning: Algorithms (linear regression, decision trees)" into "Supervised Learning: Algorithms (linear regression", "decision trees)" (first keeps id linear-regression-ml)
- sem 3: Split topic "Unsupervised Learning: Techniques (clustering, dimensionality reduction)" into "Unsupervised Learning: Techniques (clustering", "dimensionality reduction)" (first keeps id unsupervised-learning-techniques-clustering-dimensionality)
- sem 3: Split topic "Net Present Value (NPV) improvement from reservoir management strategies, or drilling cost reduction achieved through AI-powered optimization" into "Net Present Value (NPV) improvement from reservoir management strategies", "drilling cost reduction achieved through AI-powered optimization" (first keeps id net-present-value-npv-improvement-from-reservoir-management)
- sem 3: Split topic "Deep Learning Architectures, and Optimization Algorithms" into "Deep Learning Architectures", "Optimization Algorithms" (first keeps id deep-learning-architectures-and-optimization-algorithms)
- sem 3: Split topic "production forecasting with RNNs, or wellbore stability analysis with MLPs" into "production forecasting with RNNs", "wellbore stability analysis with MLPs" (first keeps id production-forecasting-with-rnns-or-wellbore-stability)
- sem 3: Split topic "vapour pressure, and compressibility factor" into "vapour pressure", "compressibility factor" (first keeps id vapour-pressure-and-compressibility-factor)
- sem 3: Split topic "Fluid Statics: Pressure and its measurement (manometers, Bourdon gauge, piezometer)" into "Fluid Statics: Pressure and its measurement (manometers", "Bourdon gauge, piezometer)" (first keeps id fluid-statics-pressure-and-its-measurement-manometers)
- sem 3: Split topic "Kinematics of Fluid Flow: Types of flow – steady/unsteady" into "Kinematics of Fluid Flow: Types of flow", "steady/unsteady" (first keeps id kinematics-of-fluid-flow-types-of-flow-steady-unsteady)
- sem 3: Split topic "rotational/irrotational. Streamlines, Pathlines, and Streaklines. Continuity Equation. Euler’s and Bernoulli’s Equations: Derivation, assumptions, and practical applications" into "rotational/irrotational, Streamlines, Pathlines, Streaklines", "Continuity Equation", "Euler’s and Bernoulli’s Equations: Derivation, assumptions", "practical applications" (first keeps id euler-bernoulli-fm)
- sem 3: Split topic "Energy and Momentum Principles: Momentum equation and applications (nozzle, diffuser, bend, and jet impingement)" into "Energy and Momentum Principles: Momentum equation and applications (nozzle, diffuser, bend", "jet impingement)" (first keeps id energy-and-momentum-principles-momentum-equation-and)
- sem 3: Split topic "contractions. Flow Through Porous Media: Darcy’s Law, permeability, and porosity concepts" into "Flow Through Porous Media: Darcy’s Law, permeability", "porosity concepts" (first keeps id permeability-darcy-res)
- sem 3: Split topic "Venturimeter, Orifice meter, Rotameter, Turbine and Positive Displacement meters" into "Orifice meter, Rotameter", "Turbine and Positive Displacement meters, construction" (first keeps id venturimeter-orifice-meter-rotameter-turbine-and-positive)
- sem 3: Split topic "types (gate, globe, ball, check, butterfly), functions, and flow control characteristics" into "types (gate, globe, ball, check, butterfly), functions", "flow control characteristics" (first keeps id types-gate-globe-ball-check-butterfly-functions-and-flow)
- sem 3: Split topic "mechanical properties of metals – concepts of stress and strain" into "mechanical properties of metals", "concepts of stress and strain" (first keeps id mechanical-properties-of-metals-concepts-of-stress-and)
- sem 3: Split topic "stress field acting at a point – derivation of equations for σn and τn. Mohr’s circle" into "stress field acting at a point", "derivation of equations for σn and τn", "Mohr’s circle" (first keeps id stress-field-acting-at-a-point-derivation-of-equations-for-n)
- sem 3: Split topic "effective stress, undrained modulus of elasticity, coefficient of compressibility, coefficient of consolidation, significance of drainage path length and the rate of consolidation" into "effective stress", "undrained modulus of elasticity", "coefficient of compressibility", "coefficient of consolidation", "significance of drainage path length and the rate of consolidation" (first keeps id effective-stress-undrained-modulus-of-elasticity-coefficient)
- sem 3: Split topic "Tectonic stress field" into "Tectonic stress field", "stress fields" (first keeps id tectonic-stress-field)
- sem 3: Split topic "Hydraulic Fracturing: Process, geomechanical factors effecting fracture development and simple calculations" into "Hydraulic Fracturing: Process", "geomechanical factors effecting fracture development and simple calculations" (first keeps id hydraulic-fracturing-process-geomechanical-factors-effecting)
- sem 3: Split topic "Oil and Gas, Geothermal Energy, Carbon Capture and Storage, and Hydrogen Storage" into "Oil and Gas", "Geothermal Energy", "Carbon Capture and Storage", "Hydrogen Storage" (first keeps id oil-and-gas-geothermal-energy-carbon-capture-and-storage-and)
- sem 3: Split topic "Burial history curve with oil and gas window. Seeps and surface geochemical exploration" into "Burial history curve with oil and gas window", "Seeps and surface geochemical exploration" (first keeps id burial-history-curve-with-oil-and-gas-window-seeps-and)
- sem 3: Split topic "Anomaly and well placement based on electrical data. Basic well logs, GR" into "Anomaly and well placement based on electrical data", "Basic well logs" (first keeps id anomaly-and-well-placement-based-on-electrical-data-basic)
- sem 3: Split topic "time slice and its importance. Horizon and Fault mapping" into "time slice and its importance", "Horizon and Fault mapping" (first keeps id time-slice-and-its-importance-horizon-and-fault-mapping)
- sem 4: Split topic "Connected Oilfield: Integration of sensors, actuators, and communication networks across oilfield operations" into "Connected Oilfield: Integration of sensors, actuators", "communication networks across oilfield operations" (first keeps id connected-oilfield-integration-of-sensors-actuators-and)
- sem 4: Split topic "Drilling Rig Components/Systems: Power, Derrick & Sub-structure, Hoisting System, Rotary systems, Circulation & Mud treatment, Rig control system" into "Drilling Rig Components/Systems: Power", "Derrick & Sub-structure", "Hoisting System", "Rotary systems", "Circulation & Mud treatment", "Rig control system" (first keeps id drilling-rig-components-systems-power-derrick-and-sub)
- sem 4: Split topic "Drilling Fluids: Basics, Functions, Properties and Nature" into "Drilling Fluids: Basics, Functions", "Properties and Nature" (first keeps id drilling-fluids-basics-functions-properties-and-nature)
- sem 4: Split topic "Pneumatic drilling fluid, Water-based drilling fluids, Oil-based drilling fluids" into "Pneumatic drilling fluid", "Water-based drilling fluids", "Oil-based drilling fluids" (first keeps id pneumatic-drilling-fluid-water-based-drilling-fluids-oil)
- sem 4: Split topic "Latest advances and emerging trends in drilling fluids viz. use of NDDF, Inhibitive, and Non-inhibitive" into "Latest advances and emerging trends in drilling fluids viz. use of NDDF, Inhibitive", "Non-inhibitive" (first keeps id latest-advances-and-emerging-trends-in-drilling-fluids-viz)
- sem 4: Split topic "Rheological models of drilling fluids: Bingham Plastic Model, Power law model, Herschel-Buckley model, Mud weight Calculations" into "Rheological models of drilling fluids: Bingham Plastic Model", "Power law model", "Herschel-Buckley model", "Mud weight Calculations" (first keeps id rheological-models-of-drilling-fluids-bingham-plastic-model)
- sem 4: Split topic "Pore Pressure prediction, Fracture pressure, Overburden Pressure, and Abnormal pressure" into "Pore Pressure prediction", "Fracture pressure", "Overburden Pressure", "Abnormal pressure" (first keeps id pore-pressure-prediction-fracture-pressure-overburden)
- sem 4: Split topic "Drill Bits: Types, Performance and Criteria for design, Bit Nozzle size selection, Rig Hydraulics" into "Drill Bits: Types", "Performance and Criteria for design", "Bit Nozzle size selection", "Rig Hydraulics" (first keeps id drill-bits-types-performance-and-criteria-for-design-bit)
- sem 4: Split topic "Casing: Functions, Configuration, Types, Properties, Casing setting depth and hole sizes, Casing handling practices" into "Casing: Functions, Configuration, Types, Properties", "Casing setting depth and hole sizes", "Casing handling practices" (first keeps id casing-functions-configuration-types-properties-casing)
- sem 4: Split topic "Introduction to Cementing, Cement and Cement Slurry: Objectives of cementing, Classification of cement, Slurry design, Slurry additives, Factors influencing cement slurry design" into "Introduction to Cementing", "Cement and Cement Slurry: Objectives of cementing", "Classification of cement", "Slurry design", "Slurry additives", "Factors influencing cement slurry design" (first keeps id introduction-to-cementing-cement-and-cement-slurry)
- sem 4: Split topic "Cementing equipment" into "Cementing equipment", "Cementing Methods: Primary cementing" (first keeps id cementing-equipment)
- sem 4: Split topic "Cementing Methods: Primary cementing, Stage cementing, Liner cementing, Plug Cementing, Squeeze Cementing techniques in practice" into "Stage cementing", "Liner cementing", "Plug Cementing", "Squeeze Cementing techniques in practice" (first keeps id cementing-methods-primary-cementing-stage-cementing-liner)
- sem 4: Split topic "Characteristics of good quality cementation using CBL/VDL. Cementing calculation" into "Characteristics of good quality cementation using CBL/VDL", "Cementing calculation" (first keeps id characteristics-of-good-quality-cementation-using-cbl-vdl)
- sem 4: Split topic "Pipe sticking and Calculations, Pipe failure, Lost circulation, Hole Deviation, Sloughing shale, Formation damage, Borehole Instability" into "Pipe sticking and Calculations", "Pipe failure", "Lost circulation", "Hole Deviation", "Sloughing shale", "Formation damage", "Borehole Instability" (first keeps id pipe-sticking-and-calculations-pipe-failure-lost-circulation)
- sem 4: Split topic "Drilling waste management: Classification of drilling waste, Approaches of Drilling waste minimization" into "Drilling waste management: Classification of drilling waste", "Approaches of Drilling waste minimization" (first keeps id drilling-waste-management-classification-of-drilling-waste)
- sem 4: Split topic "Single phase and multiphase fluid flow in different state (steady and unsteady) and different systems (linear, radial, turbulent, spherical) considering compressible" into "Single phase and multiphase fluid flow in different state (steady and unsteady) and different systems (linear, radial, turbulent", "spherical) considering compressible" (first keeps id single-phase-and-multiphase-fluid-flow-in-different-state)
- sem 4: Split topic "Reservoir Field operation data acquisition, Basic data of reservoir engineering" into "Reservoir Field operation data acquisition", "Basic data of reservoir engineering" (first keeps id reservoir-field-operation-data-acquisition-basic-data-of)
- sem 4: Split topic "PVT data, Core data, Well logging and transient well testing information" into "PVT data", "Core data", "Well logging and transient well testing information" (first keeps id pvt-data-core-data-well-logging-and-transient-well-testing)
- sem 4: Split topic "Reservoir Drive Mechanism, Application of reservoir engineering principles: volumetric, material balance and decline curve analysis" into "Reservoir Drive Mechanism", "Application of reservoir engineering principles: volumetric", "material balance and decline curve analysis" (first keeps id reservoir-drive-mechanism-application-of-reservoir)
- sem 4: Split topic "Types of cores, Routine and special core analysis techniques" into "Types of cores", "Routine and special core analysis techniques" (first keeps id types-of-cores-routine-and-special-core-analysis-techniques)
- sem 4: Split topic "Basic principle, data acquisition and interpretation of Temperature and Calliper Logs" into "Basic principle", "data acquisition and interpretation of Temperature and Calliper Logs" (first keeps id basic-principle-data-acquisition-and-interpretation-of)
- sem 4: Split topic "GR lags: Basic principle, data acquisition and interpretation of gamma ray and spectral gamma ray logs" into "GR lags: Basic principle", "data acquisition and interpretation of gamma ray and spectral gamma ray logs" (first keeps id gr-lags-basic-principle-data-acquisition-and-interpretation)
- sem 4: Split topic "Resistivity Logs: tools, data acquisition and interpretation" into "Resistivity Logs: tools", "data acquisition and interpretation", "Resistivity logs" (first keeps id resistivity-logs-tools-data-acquisition-and-interpretation)
- sem 4: Split topic "Data acquisition and interpretation of Density porosity, Neutron porosity and Sonic logs" into "Data acquisition and interpretation of Density porosity", "Neutron porosity and Sonic logs", "Sonic Neutron" (first keeps id porosity-logs)
- sem 4: Split topic "Nuclear Magnetic Resonance Log (Principles, Porosity and permeability estimation, type of fluid identification)" into "Nuclear Magnetic Resonance Log (Principles", "Porosity and permeability estimation", "type of fluid identification)" (first keeps id nuclear-magnetic-resonance-log-principles-porosity-and)
- sem 4: Split topic "Assignments to determine porosity, lithology and mineralogy from logs and their cross plots" into "Assignments to determine porosity", "lithology and mineralogy from logs and their cross plots" (first keeps id assignments-to-determine-porosity-lithology-and-mineralogy)
- sem 4: Split topic "Integration of different log data to determine lithology, shale volume, minerology, porosity, and net pay thickness" into "Integration of different log data to determine lithology", "shale volume, minerology, porosity", "net pay thickness" (first keeps id integration-of-different-log-data-to-determine-lithology)
- sem 4: Split topic "overall heat transfer coefficient" into "overall heat transfer coefficient", "Heat transfer rate and Heat transfer coefficient calculations" (first keeps id overall-heat-transfer-coefficient)
- sem 4: Split topic "Shell and tube heat exchanger, and finned tube heat exchanger. Boiling of liquids and condensation of vapours" into "Shell and tube heat exchanger", "finned tube heat exchanger", "Boiling of liquids and condensation of vapours" (first keeps id shell-and-tube-heat-exchanger-and-finned-tube-heat-exchanger)
- sem 4: Split topic "Introduction, theories of radiation, electromagnetic spectrum, spectral emissive power, surface emission, total emissive power, emissivity" into "Introduction, theories of radiation", "electromagnetic spectrum", "spectral emissive power", "surface emission, emissivity" (first keeps id em-spectrum)
- sem 4: Split topic "Radiative properties, emission, irradiation, absorptivity, reflectivity and transmissivity" into "Radiative properties, emission, irradiation, absorptivity", "reflectivity and transmissivity" (first keeps id radiative-properties-emission-irradiation-absorptivity)
- sem 4: Split topic "Concept of black and grey body, radiation intensity, laws of black body radiation, non-black surfaces, radiation between black and grey surfaces" into "Concept of black and grey body", "radiation intensity", "laws of black body radiation", "non-black surfaces", "radiation between black and grey surfaces" (first keeps id concept-of-black-and-grey-body-radiation-intensity-laws-of)
- sem 4: Split topic "Diffusion in gases: Fick’s law, determination and estimation of diffusion coefficient" into "Diffusion in gases: Fick’s law", "determination and estimation of diffusion coefficient" (first keeps id diffusion-in-gases-ficks-law-determination-and-estimation-of)
- sem 4: Split topic "Diffusion in liquids: Mass transfer across phase boundaries, two-film theory and mass transfer coefficient" into "Diffusion in liquids: Mass transfer across phase boundaries", "two-film theory and mass transfer coefficient" (first keeps id diffusion-in-liquids-mass-transfer-across-phase-boundaries)
- sem 5: Split topic "Meaning and scope of petroleum engineering economics, fundamentals of economics: scarcity and choice" into "Meaning and scope of petroleum engineering economics", "fundamentals of economics: scarcity and choice" (first keeps id meaning-and-scope-of-petroleum-engineering-economics)
- sem 5: Split topic "renewable vs non-renewable, role of petroleum sector in development, objective of a firm, production possibility curve" into "renewable vs non-renewable", "role of petroleum sector in development", "objective of a firm", "production possibility curve" (first keeps id renewable-vs-non-renewable-role-of-petroleum-sector-in)
- sem 5: Split topic "demand schedule, demand curve" into "demand schedule", "demand curve" (first keeps id demand-schedule-demand-curve)
- sem 5: Split topic "elasticity of demand and supply, Game theory" into "elasticity of demand and supply", "Game theory" (first keeps id elasticity-of-demand-and-supply-game-theory)
- sem 5: Split topic "Competition in fossil fuel and gas industry, Issues of energy security, Energy price regulations and mechanism" into "Competition in fossil fuel and gas industry", "Issues of energy security", "Energy price regulations and mechanism" (first keeps id competition-in-fossil-fuel-and-gas-industry-issues-of-energy)
- sem 5: Split topic "Operational Safety, Introduction to HSE Safety assurance, Safety in design and operations, Organizing for safety Hazard, classification and assessment, Hazard evaluation and control, Hazop, FMEA, Risk" into "Operational Safety", "Introduction to HSE Safety assurance", "Safety in design and operations", "Organizing for safety Hazard", "classification and assessment", "Hazard evaluation and control, Hazop", "FMEA", "HAZOP" (first keeps id operational-safety-introduction-to-hse-safety-assurance)
- sem 5: Split topic "Classification of Hazardous locations, Hazardous area (Ref IER, OISD, OMR, API RP 500 & 14 F) Accident Investigations: Study of major Accidents like Piper Alpha, Flixborough, Bhopal etc., Investigatio" into "OISD, OMR)", "Classification of Hazardous locations", "Hazardous area (Ref IER", "OMR", "API RP 500 & 14 F) Accident Investigations: Study of major Accidents like Piper Alpha, Flixborough, Bhopal etc" (first keeps id classification-of-hazardous-locations-hazardous-area-ref-ier)
- sem 5: Split topic "Audit methodology, protocol, typical checklists for Drilling rigs, Work over activities, logging, etc" into "Audit methodology, protocol", "typical checklists for Drilling rigs", "Work over activities, logging, etc" (first keeps id audit-methodology-protocol-typical-checklists-for-drilling)
- sem 5: Split topic "Air, Water, & Soil of HCs, Environmental Impact Assessment, Oil Spills Control and their Management" into "& Soil of HCs", "Environmental Impact Assessment", "Oil Spills Control and their Management" (first keeps id air-water-and-soil-of-hcs-environmental-impact-assessment)
- sem 5: Split topic "Directorate of Mine Safety, DGMS. Downstream Safety: Implementing Agency PNGRB" into "Directorate of Mine Safety", "DGMS", "Downstream Safety: Implementing Agency PNGRB" (first keeps id directorate-of-mine-safety-dgms-downstream-safety)
- sem 5: Split topic "Safety Regulations (Technical Standard, Specification and Safety Standards T4S), Emergencies, Mutual Aida" into "Safety Regulations (Technical Standard", "Specification and Safety Standards T4S), Emergencies", "Mutual Aida" (first keeps id safety-regulations-technical-standard-specification-and)
- sem 5: Split topic "Fluid catalytic cracking –processes, operating parameters, feed stock selection and product yields –Advantages" into "Fluid catalytic cracking –processes", "feed stock selection and product yields –Advantages" (first keeps id fcc)
- sem 5: Split topic "Asphalt manufacture, Air blowing technology, Bitumen Types and their properties, Acid gas removal and sulphur removal techniques" into "Asphalt manufacture", "Air blowing technology", "Bitumen Types and their properties", "Acid gas removal and sulphur removal techniques" (first keeps id asphalt-manufacture-air-blowing-technology-bitumen-types-and)
- sem 5: Split topic "tubular and flow lines. Surface and subsurface chokes. Fundamentals of Well Testing" into "tubular and flow lines", "Surface and subsurface chokes", "Fundamentals of Well Testing" (first keeps id tubular-and-flow-lines-surface-and-subsurface-chokes)
- sem 5: Split topic "Perforating Oil & Gas Wells - Conventional and Unconventional techniques viz. through tubing and tubing conveyed underbalanced perforating techniques" into "Perforating Oil & Gas Wells", "Conventional and Unconventional techniques viz. through tubing and tubing conveyed underbalanced perforating techniques" (first keeps id perforating-oil-and-gas-wells-conventional-and)
- sem 5: Split topic "Productivity index. Formation damage diagnosis" into "Productivity index", "Formation damage diagnosis" (first keeps id productivity-index-formation-damage-diagnosis)
- sem 5: Split topic "multiphase flow regimes. Choke performance" into "multiphase flow regimes", "Choke performance" (first keeps id multiphase-flow-regimes-choke-performance)
- sem 5: Split topic "types of chokes. Overall production system pressure losses" into "types of chokes", "Overall production system pressure losses" (first keeps id types-of-chokes-overall-production-system-pressure-losses)
- sem 5: Split topic "Fluid identification tools (Temperature log, Nuclear fluid density, GHOST, and DEFT) Advanced logging tools (Flow Scan Imager Tool and Multiple Array Production Suit, and Noise logs)" into "Fluid identification tools (Temperature log", "Nuclear fluid density", "GHOST", "DEFT) Advanced logging tools (Flow Scan Imager Tool and Multiple Array Production Suit", "Noise logs)" (first keeps id fluid-identification-tools-temperature-log-nuclear-fluid)
- sem 5: Split topic "chokes and surface flow lines. Production Optimization – Nodal System analysis" into "chokes and surface flow lines", "Production Optimization", "Nodal System analysis" (first keeps id chokes-and-surface-flow-lines-production-optimization-nodal)
- sem 5: Split topic "Well testing in gas reservoirs (pseudo pressure, pseudo time)" into "Well testing in gas reservoirs (pseudo pressure", "pseudo time)" (first keeps id well-testing-in-gas-reservoirs-pseudo-pressure-pseudo-time)
- sem 5: Split topic "Integration of well test data with other reservoir data (seismic, well logs, production data)" into "Integration of well test data with other reservoir data (seismic", "well logs", "production data)" (first keeps id integration-of-well-test-data-with-other-reservoir-data)
- sem 5: Split topic "Well surveying objectives, & tools for surveying/methods" into "Well surveying objectives", "& tools for surveying/methods" (first keeps id well-surveying-objectives-and-tools-for-surveying-methods)
- sem 5: Split topic "Extended reach drilling, Special mud requirements and their characteristics for horizontal drilling" into "Extended reach drilling", "Special mud requirements and their characteristics for horizontal drilling" (first keeps id extended-reach-drilling-special-mud-requirements-and-their)
- sem 5: Split topic "The anatomy of a well kick and blowouts: Problem, symptoms and controlling measures" into "The anatomy of a well kick and blowouts: Problem", "symptoms and controlling measures" (first keeps id the-anatomy-of-a-well-kick-and-blowouts-problem-symptoms-and)
- sem 5: Split topic "Kick control methods: Dynamic kick control, Driller method & Engineer methods, Well killing calculations" into "Kick control methods: Dynamic kick control", "Driller method & Engineer methods", "Well killing calculations" (first keeps id kick-control-methods-dynamic-kick-control-driller-method-and)
- sem 6: Split topic "Exploratory Data Analysis: Univariate, Bivariate, and Multivariate analysis" into "Exploratory Data Analysis: Univariate, Bivariate", "Multivariate analysis" (first keeps id exploratory-data-analysis-univariate-bivariate-and)
- sem 6: Split topic "Regression Modeling and Analysis, Simple linear regression, multiple regression, nonparametric transformation and regression" into "Regression Modeling and Analysis", "Simple linear regression", "multiple regression", "nonparametric transformation and regression" (first keeps id linear-regression-ml)
- sem 6: Split topic "multi-attribute regression modeling, data driven modelling" into "multi-attribute regression modeling", "data driven modelling" (first keeps id multi-attribute-regression-modeling-data-driven-modelling)
- sem 6: Split topic "field applications and case studies, coding assignments" into "field applications and case studies", "coding assignments" (first keeps id field-applications-and-case-studies-coding-assignments)
- sem 6: Split topic "Fundamentals of CO₂ capture, Carbon capture pathways" into "Fundamentals of CO₂ capture", "Carbon capture pathways" (first keeps id fundamentals-of-co-capture-carbon-capture-pathways)
- sem 6: Split topic "Trapping mechanisms (Structural trapping, Residual trapping, Solubility trapping, and Mineral trapping)" into "Trapping mechanisms (Structural trapping", "Residual trapping", "Solubility trapping", "Mineral trapping)" (first keeps id trapping-mechanisms-structural-trapping-residual-trapping)
- sem 6: Split topic "CO₂ injectivity, Subsurface CO₂ injection, CO₂ plume migration and reservoir pressure management" into "CO₂ injectivity", "Subsurface CO₂ injection", "CO₂ plume migration and reservoir pressure management" (first keeps id co-injectivity-subsurface-co-injection-co-plume-migration)
- sem 6: Split topic "Monitoring techniques: Seismic monitoring, Well logging, Pressure monitoring, Soil gas monitoring, Satellite monitoring" into "Monitoring techniques: Seismic monitoring", "Well logging", "Pressure monitoring", "Soil gas monitoring", "Satellite monitoring" (first keeps id monitoring-techniques-seismic-monitoring-well-logging)
- sem 6: Split topic "Gas processing for pipeline transportation (Corrosion protection, limits for water, H2S and CO2 contents)" into "Gas processing for pipeline transportation (Corrosion protection", "limits for water", "H2S and CO2 contents)" (first keeps id gas-processing-for-pipeline-transportation-corrosion)
- sem 6: Split topic "Gas processing for LNG Production (limits of Water, CO2, H2S and Mercury contents etc.)" into "Gas processing for LNG Production (limits of Water", "CO2", "H2S and Mercury contents etc.)" (first keeps id gas-processing-for-lng-production-limits-of-water-co2-h2s)
- sem 6: Split topic "Factors affecting pipeline design (External, fluid properties, pipeline parameters and Fluid flow considerations" into "Factors affecting pipeline design (External", "fluid properties", "pipeline parameters and Fluid flow considerations" (first keeps id factors-affecting-pipeline-design-external-fluid-properties)
- sem 6: Split topic "Introduction to Geological Modelling, Geostatistical Modelling & Variogram correction, classification of Models, Need for reservoir simulation, Applications of reservoir simulation, Steps of reservoir" into "Introduction to Geological Modelling", "Geostatistical Modelling & Variogram correction", "classification of Models", "Need for reservoir simulation", "Applications of reservoir simulation", "Steps of reservoir simulation" (first keeps id introduction-to-geological-modelling-geostatistical)
- sem 6: Split topic "Continuity Equation, Equation of Motion, Darcy and Non-Darcy Flow" into "Continuity Equation", "Equation of Motion", "Darcy and Non-Darcy Flow" (first keeps id continuity-equation-equation-of-motion-darcy-and-non-darcy)
- sem 6: Split topic "Preview of Numerical Solution Methods: Direct & Iterative method, stability criteria, Well representation" into "Preview of Numerical Solution Methods: Direct & Iterative method", "stability criteria", "Well representation" (first keeps id preview-of-numerical-solution-methods-direct-and-iterative)
- sem 6: Split topic "Model validation/verification: History Matching, Optimization algorithms in History Matching, performance prediction" into "Model validation/verification: History Matching", "Optimization algorithms in History Matching", "performance prediction" (first keeps id model-validation-verification-history-matching-optimization)
- sem 6: Split topic "Introduction to Streamline Simulation, comparison of Conventional / Streamline Simulation" into "Introduction to Streamline Simulation", "comparison of Conventional / Streamline Simulation" (first keeps id introduction-to-streamline-simulation-comparison-of)
- sem 6: Split topic "Flow improver (Pour point depression and Drag reducer, heat treatment)" into "Flow improver (Pour point depression and Drag reducer", "heat treatment)" (first keeps id flow-improver-pour-point-depression-and-drag-reducer-heat)
- sem 6: Split topic "Techniques of drilling and completing in shallow water, Techniques of drilling and completion in deep water, subsea completion, Drilling and production risers, flexible risers: configuration and layin" into "Techniques of drilling and completing in shallow water", "Techniques of drilling and completion in deep water", "subsea completion", "Drilling and production risers" (first keeps id techniques-of-drilling-and-completing-in-shallow-water)
- sem 6: Split topic "Smart and intelligent well completion, Oil processing in offshore and comparison with onshore" into "Smart and intelligent well completion", "Oil processing in offshore and comparison with onshore" (first keeps id smart-and-intelligent-well-completion-oil-processing-in)
- sem 6: Split topic "Offshore Safety and fire protection, Safety systems for offshore operations, Case history analysis and lessons learned" into "Offshore Safety and fire protection", "Safety systems for offshore operations", "Case history analysis and lessons learned" (first keeps id offshore-safety-and-fire-protection-safety-systems-for)
- sem 6: Split topic "Oil Shale: Geological features Oil Shale formations, Chemical composition, Components of Oil Shale: Bitumen, Kerogen, Mineral matrix, Resource recovery technologies, Commercial value and Environmental" into "Oil Shale: Geological features Oil Shale formations", "Chemical composition", "Components of Oil Shale: Bitumen, Kerogen", "Mineral matrix", "Resource recovery technologies", "oil shale recovery technology" (first keeps id oil-shale-geological-features-oil-shale-formations-chemical)
- sem 6: Split topic "Shale gas: Definition and prospect, geological conditions for the formation of oil shale, oil shale recovery technology, ex-situ and in-situ extraction processes of shale oil, various retorting proces" into "Shale gas: Definition and prospect", "geological conditions for the formation of oil shale", "ex-situ and in-situ extraction processes of shale oil", "various retorting processes", "Shale Gas: Definition and prospect", "the conditions of formation of shale gas", "shale gas" (first keeps id shale-gas-definition-and-prospect-geological-conditions-for)
- sem 6: Split topic "an example of the success story of shale gas exploitation, methods of production, hydrofracturing, the composition of fracking fluid, water management, shale gas" into "an example of the success story of shale gas exploitation", "methods of production, hydrofracturing", "the composition of fracking fluid", "water management" (first keeps id an-example-of-the-success-story-of-shale-gas-exploitation)
- sem 6: Split topic "Tar Sand: Definition and prospect, the distinction between heavy oil and bitumen, mineralogy and properties of oil sand, elemental composition and properties of bitumen, methods of recovery of bitumen" into "Tar Sand: Definition and prospect", "the distinction between heavy oil and bitumen", "mineralogy and properties of oil sand", "elemental composition and properties of bitumen" (first keeps id tar-sand-definition-and-prospect-the-distinction-between)
- sem 6: Split topic "Definition, History of Hydrate R&D, prospect, types of methane hydrate deposits, chemistry and structure of natural methane hydrate, Necessary Conditions for Methane Hydrate Formation, typical conditi" into "Definition, History of Hydrate R&D, prospect", "types of methane hydrate deposits", "chemistry and structure of natural methane hydrate", "Necessary Conditions for Methane Hydrate Formation" (first keeps id definition-history-of-hydrate-r-and-d-prospect-types-of)
- sem 6: Split topic "Definition and prospect, CBM, CMM, and AMM" into "Definition and prospect", "CBM", "CMM", "AMM" (first keeps id definition-and-prospect-cbm-cmm-and-amm)
- sem 6: Split topic "Conventional Reservoir –Gas Composition, Adsorption, Water Production, Gas Flow, Rock Physical Properties, Gas Content, Coal Rank, Gas Production" into "Conventional Reservoir –Gas Composition", "Adsorption", "Water Production", "Gas Flow", "Rock Physical Properties", "Gas Content", "Coal Rank", "Gas Production", "Physical Properties" (first keeps id conventional-reservoir-gas-composition-adsorption-water)
- sem 6: Split topic "Molecular Structure, Macerals, Lithotypes, Functional Groups, Proximate Analysis, Ultimate Analysis" into "Molecular Structure, Macerals, Lithotypes", "Functional Groups", "Proximate Analysis", "Ultimate Analysis" (first keeps id molecular-structure-macerals-lithotypes-functional-groups)
- sem 6: Split topic "Definition and Measurement, Vitrinite Reflectance Measurement, Physical Properties, Volatiles Generated, Micropores" into "Definition and Measurement", "Vitrinite Reflectance Measurement", "Volatiles Generated, Micropores" (first keeps id definition-and-measurement-vitrinite-reflectance-measurement)
- sem 6: Split topic "different types of isotherms, Langmuir Isotherm, Methane Retention" into "different types of isotherms", "Langmuir Isotherm", "Methane Retention" (first keeps id different-types-of-isotherms-langmuir-isotherm-methane)
- sem 7: Split topic "scale deposition, and gas hydrates formation" into "scale deposition", "gas hydrates formation" (first keeps id scale-deposition-and-gas-hydrates-formation)
- sem 7: Split topic "Corrosion fundamentals, Corrosion in oil Industry, Cost of corrosion in the industry, Corrosivity of hydrocarbon fluids:- Water-oil, emulsion and multiphase flow regime, Wettability of metal surface, " into "Corrosion fundamentals", "Corrosion in oil Industry", "Cost of corrosion in the industry", "Corrosivity of hydrocarbon fluids:- Water-oil", "emulsion and multiphase flow regime", "Wettability of metal surface" (first keeps id corrosion-fundamentals-corrosion-in-oil-industry-cost-of)
- sem 7: Split topic "Influence of oil chemistry on the Corrosivity of the aqueous phase. Pipeline corrosion" into "Influence of oil chemistry on the Corrosivity of the aqueous phase", "Pipeline corrosion" (first keeps id influence-of-oil-chemistry-on-the-corrosivity-of-the-aqueous)
- sem 7: Split topic "Transport through the porous surface scales. Corrosion products" into "Transport through the porous surface scales", "Corrosion products" (first keeps id transport-through-the-porous-surface-scales-corrosion)
- sem 7: Split topic "Formation of hydride. Pipeline flow Corrosivity: Effect of water wetting" into "Formation of hydride", "Pipeline flow Corrosivity: Effect of water wetting" (first keeps id formation-of-hydride-pipeline-flow-corrosivity-effect-of)
- sem 7: Split topic "Effect of temperature. Materials selection:- Significance of alloying composition" into "Effect of temperature", "Materials selection:- Significance of alloying composition" (first keeps id effect-of-temperature-materials-selection-significance-of)
- sem 7: Split topic "Experimental setups, methods, and standards:- Multiphase flow loop" into "Experimental setups, methods", "standards:- Multiphase flow loop, Autoclave" (first keeps id experimental-setups-methods-and-standards-multiphase-flow)
- sem 7: Split topic "Chemical treatment and corrosion inhibitors:-Corrosion control by industrial inhibitors, Application methods" into "Chemical treatment and corrosion inhibitors:-Corrosion control by industrial inhibitors", "Application methods" (first keeps id chemical-treatment-and-corrosion-inhibitors-corrosion)
- sem 7: Split topic "Surface area, surface energy, and quantum effects" into "Surface area", "surface energy", "quantum effects" (first keeps id surface-area-surface-energy-and-quantum-effects)
- sem 7: Split topic "Types of nanoparticles: metal, non-metal oxide, carbon-based, polymeric, and nanocomposites" into "Types of nanoparticles: metal", "non-metal oxide", "carbon-based, polymeric, nanocomposites" (first keeps id types-of-nanoparticles-metal-non-metal-oxide-carbon-based)
- sem 7: Split topic "Characterization techniques: SEM, TEM, XRD, FTIR, DLS, Zeta potential, BET, TGA" into "Characterization techniques: SEM", "TEM", "XRD", "FTIR", "DLS", "Zeta potential", "BET", "TGA" (first keeps id characterization-techniques-sem-tem-xrd-ftir-dls-zeta)
- sem 7: Split topic "Nanotechnology in carbon capture, utilization, and storage (CCUS)" into "Nanotechnology in carbon capture, utilization", "storage (CCUS)" (first keeps id nanotechnology-in-carbon-capture-utilization-and-storage)
- sem 7: Split topic "Types of Natural Gas, Introduction to concept of Geographical Area (GA), History of CGD in India" into "Types of Natural Gas", "Introduction to concept of Geographical Area (GA)", "History of CGD in India" (first keeps id types-of-natural-gas-introduction-to-concept-of-geographical)
- sem 7: Split topic "LNG, LPG, and CGD business. Gas Value Chain: Gas Transmission and Distribution System" into "LNG", "LPG", "CGD business", "Gas Value Chain: Gas Transmission and Distribution System" (first keeps id lng-lpg-and-cgd-business-gas-value-chain-gas-transmission)
- sem 7: Split topic "CNG infrastructure: Mother Station, Online Station, Daughter Station, Daughter Booster Station" into "CNG infrastructure: Mother Station", "Online Station", "Daughter Station", "Daughter Booster Station" (first keeps id cng-infrastructure-mother-station-online-station-daughter)
- sem 7: Split topic "Upstream and downstream regulators, Powers and functions of Petroleum and Natural Gas Regulatory Board (PNGRB), Evolution of CGD bidding in India till date, Bidding attributes and Bid authorization, N" into "Upstream and downstream regulators", "Powers and functions of Petroleum and Natural Gas Regulatory Board (PNGRB)", "Evolution of CGD bidding in India till date", "Bidding attributes and Bid authorization" (first keeps id upstream-and-downstream-regulators-powers-and-functions-of)
- sem 7: Split topic "Well analysis and remedial measures, Principles and application of workover methods, workover rig, Coil tubing unit, workover fluids, Water Control Techniques-Reasons, identification and control techn" into "Well analysis and remedial measures", "Principles and application of workover methods", "workover rig", "Coil tubing unit", "workover fluids", "Water Control Techniques-Reasons", "identification and control techniques" (first keeps id well-analysis-and-remedial-measures-principles-and)
- sem 7: Split topic "Stress profile and fracture height containment, well placement" into "Stress profile and fracture height containment", "well placement" (first keeps id stress-profile-and-fracture-height-containment-well)
- sem 7: Split topic "Treatment stage design, Calculations of clean and slurry volumes for treatment designs, surface pumping pressure and no. of pumps and other relevant topics" into "Treatment stage design", "Calculations of clean and slurry volumes for treatment designs", "surface pumping pressure and no. of pumps and other relevant topics" (first keeps id treatment-stage-design-calculations-of-clean-and-slurry)
- sem 7: Split topic "Multi-stage fracturing: Stage length and cluster spacing, Multistage fracturing techniques: Plug & perf, sliding sleeves, Fluid diverters" into "Multi-stage fracturing: Stage length and cluster spacing", "Multistage fracturing techniques: Plug & perf", "sliding sleeves", "Fluid diverters" (first keeps id multi-stage-fracturing-stage-length-and-cluster-spacing)
- sem 7: Split topic "Refracturing: benefits and limitations, candidate selection, procedures" into "Refracturing: benefits and limitations", "candidate selection, procedures" (first keeps id refracturing-benefits-and-limitations-candidate-selection)
- sem 7: Split topic "Diagnostic methods: microseismic, fiber sensing-DAS and DTS, radioactive tracers, and tiltmeter" into "Diagnostic methods: microseismic", "fiber sensing-DAS and DTS", "radioactive tracers, tiltmeter" (first keeps id diagnostic-methods-microseismic-fiber-sensing-das-and-dts)
- sem 7: Split topic "Modelling 2D, Pseudo3D, and 3D models" into "Modelling 2D, Pseudo3D", "3D models" (first keeps id modelling-2d-pseudo3d-and-3d-models)
- sem 7: Split topic "Concept of integrated reservoir management, Evolution of reservoir management with time, Fundamentals of reservoir management, synergic team approach" into "Concept of integrated reservoir management", "Evolution of reservoir management with time", "Fundamentals of reservoir management", "synergic team approach" (first keeps id concept-of-integrated-reservoir-management-evolution-of)
- sem 7: Split topic "Importance of reservoir management, Reservoir Data types: Geosciences, Fluid and PVT, Petrophysical properties from core, Well logs, Transient well test, and Production, Data validation and workflow d" into "Importance of reservoir management", "Reservoir Data types: Geosciences", "Fluid and PVT", "Petrophysical properties from core", "Well logs", "Transient well test, Production" (first keeps id importance-of-reservoir-management-reservoir-data-types)
- sem 7: Split topic "Scenarios for development plans & Techno-economic evaluation. Risk management" into "Scenarios for development plans & Techno-economic evaluation", "Risk management" (first keeps id scenarios-for-development-plans-and-techno-economic)
- sem 7: Split topic "Definition of enhanced oil recovery and improved oil recovery, Difference of IOR and EOR, Target oil resource for EOR, General Classification" into "Definition of enhanced oil recovery and improved oil recovery", "Difference of IOR and EOR", "Target oil resource for EOR", "General Classification" (first keeps id definition-of-enhanced-oil-recovery-and-improved-oil)
- sem 7: Split topic "Description and potential of different EOR processes, Microscopic and macroscopic displacement of fluids in a reservoir, Displacement efficiency in different system" into "Description and potential of different EOR processes", "Microscopic and macroscopic displacement of fluids in a reservoir" (first keeps id description-and-potential-of-different-eor-processes)
- sem 7: Split topic "linear, areal, volumetric, Definition and discussion of mobility ratio and mobility control processes for different types of fluids, Miscible/Immiscible displacement processes" into "Definition and discussion of mobility ratio and mobility control processes for different types of fluids", "Miscible/Immiscible displacement processes" (first keeps id linear-areal-volumetric-definition-and-discussion-of)
- sem 7: Split topic "water flooding, gas injection, micro-emulsion flooding Chemical Flooding" into "water flooding", "gas injection", "micro-emulsion flooding Chemical Flooding" (first keeps id water-flooding-gas-injection-micro-emulsion-flooding)
- sem 7: Split topic "polymer flooding, Surfactant flooding, Micellar flooding related methods Thermal recovery processes- in situ combustion, hot-water injection, steam flooding, SAGD Microbial EOR. EOR screening criteria" into "polymer flooding", "Surfactant flooding", "Micellar flooding related methods Thermal recovery processes- in situ combustion", "hot-water injection", "steam flooding", "SAGD Microbial EOR", "EOR screening criteria" (first keeps id polymer-flooding-surfactant-flooding-micellar-flooding)
- sem 7: Split topic "Fiscal System in hydrocarbon industry (Progressive, regressive fiscal policy tax and non-tax components of Fiscal Policy)" into "Fiscal System in hydrocarbon industry (Progressive", "regressive fiscal policy tax and non-tax components of Fiscal Policy)" (first keeps id fiscal-system-in-hydrocarbon-industry-progressive-regressive)
- sem 7: Split topic "Upstream Agreements (Concessionary, Production sharing, Risk sharing,)" into "Upstream Agreements (Concessionary", "Production sharing", "Risk sharing" (first keeps id upstream-agreements-concessionary-production-sharing-risk)
- sem 7: Split topic "Indian policy on Hydrocarbon Exploration and Licensing Policy (HELP). Drilling Contracts" into "Indian policy on Hydrocarbon Exploration and Licensing Policy (HELP)", "Drilling Contracts" (first keeps id indian-policy-on-hydrocarbon-exploration-and-licensing)
- sem 7: Split topic "Gas sale and supply agreement. LNG Agreement" into "Gas sale and supply agreement", "LNG Agreement" (first keeps id gas-sale-and-supply-agreement-lng-agreement)
- sem 7: Split topic "Hydrocarbon trading-Oil trading, Physical and Paper" into "Hydrocarbon trading-Oil trading", "Physical and Paper" (first keeps id hydrocarbon-trading-oil-trading-physical-and-paper)
- sem 7: Split topic "Crude oil Markets- Spot, Barter, Future and forward" into "Crude oil Markets- Spot, Barter", "Future and forward" (first keeps id crude-oil-markets-spot-barter-future-and-forward)
- sem 7: Split topic "Oil pricing mechanism, short term and long term Oil Pricing" into "Oil pricing mechanism", "short term and long term Oil Pricing" (first keeps id oil-pricing-mechanism-short-term-and-long-term-oil-pricing)
- sem 7: Split topic "Asset Integrity Management Introduction to concept of Asset Management& Asset Integrity Management, The Asset Management System" into "Asset Integrity Management Introduction to concept of Asset Management& Asset Integrity Management", "The Asset Management System" (first keeps id asset-integrity-management-introduction-to-concept-of-asset)
- sem 7: Split topic "Risk management: using the risk matrix, risk register & hazard log" into "Risk management: using the risk matrix", "risk register & hazard log" (first keeps id risk-management-using-the-risk-matrix-risk-register-and)

</details>

<details><summary>extra item not in any handout (10)</summary>

- sem 1: Retire topic "Total derivatives" in chapter "Differential Calculus and its Applications"
- sem 2: Retire topic "Total petroleum System" in chapter "Unit 4"
- sem 3: Retire topic "compressive, shear, and torsional deformation" in chapter "Basics of Mechanics"
- sem 6: Retire topic "Pre- combustion capture" in chapter "Introduction to Carbon Capture, Utilization and Storage"
- sem 6: Retire topic "Note: The detailed syllabus page for this course prints L-T-P-C as 3-0-0-3" in chapter "Offshore Well Completion and Production System"
- sem 6: Retire topic "the credits shown here follow the official course structure table" in chapter "Offshore Well Completion and Production System"
- sem 7: Retire topic "Sulphur, and H 2S in hydrocarbon fluids" in chapter "Fundamentals of Corrosion"
- sem 7: Retire topic "Significance of H 2S" in chapter "Forms of Corrosion"
- sem 7: Retire topic "Solubility, partitioning, and compatibility. Biocides" in chapter "Pipeline Corrosion and Its Prevention"
- sem 7: Retire topic "Self- healing and smart cement systems" in chapter "Nanotechnology Applications in Drilling, Cementing, and Reservoir"

</details>

## needs_review

Not changed automatically. Each needs a person to decide.

<details><summary>handout parsing / course type (20)</summary>

- biotech sem 3: 24BT205T General Microbiology Lab (p9): code 24BT205T says theory, handout says practical
- ce sem 1: 24ME101T Workshop Practice (p8): code 24ME101T says theory, handout says practical
- ce sem 4: 24CS205T Design Thinking Laboratory (p5): code 24CS205T says theory, handout says practical
- ce sem 6: 24CS307P Distributed Computing Laboratory (p12-14): practical course, no experiment list found
- civil sem 3: no code Building Planning and Computer Aided Drawing Lab (p6): named a lab but L-T-P is 1-0-2
- civil sem 4: no code Industry 4.0 Laboratory (p3): lab written as units: each unit kept as one experiment
- civil sem 5: no code Computer Aided Design Drawing Laboratory - I (p8): lab written as units: each unit kept as one experiment
- civil sem 6: no code Environmental Engineering (Laboratory) (p5): practical course, no experiment list found
- civil sem 7: no code Project Management Laboratory (p5): named a lab but L-T-P is 3-0-2; lab written as units: each unit kept as one experiment
- elec sem 3: 20HS201P Communication Skills – II (p9): lab written as units: each unit kept as one experiment
- elec sem 5: 20HS301P Communication Skills – III (p20): lab written as units: each unit kept as one experiment
- elec sem 7: 20EE408P Electric Vehicles Laboratory (p15): practical course, no experiment list found
- ict sem 5: no code Theory of Computation and Compiler Design Laboratory (p5): practical course, no experiment list found
- me sem 1: 24ME101T Workshop Practice (p9): code 24ME101T says theory, handout says practical
- me sem 1: 24ME102T Engineering Graphics - Laboratory (p10): code 24ME102T says theory, handout says practical
- me sem 2: 24CP102P Computer Programming II Laboratory (For ME/CL/CH/BT) (p6): named a lab but L-T-P is 1-0-0
- me sem 4: 24ME206T Fluid Mechanics (p4): L-T-P 0-0-2 but a separate lab course exists
- me sem 4: 24ME208P Engineering Metallurgy Lab (p9): lab written as units: each unit kept as one experiment
- me sem 7: 24ME403P Computational Engineering Laboratory (p15): lab written as units: each unit kept as one experiment
- petro sem 4: 24PE210T Earth Science and Hydrocarbon Exploration Field Work (p9): code 24PE210T says theory, handout says practical; practical course, no experiment list found

</details>

<details><summary>unsure course match (5)</summary>

- ce sem 6: "Object Oriented Programming & Design" (24CS322T) might be pdeu-object-oriented-modelling-and-design (name 0.75, topics 0.03) or pdeu-object-oriented-programming (name 0.75, topics 0.23)
- civil sem 5: "Foundations and Geotechnical Applications" (no code) might be pdeu-foundation-and-geotechnical-applications-with-lab (name 0.50, topics 0.95)
- me sem 4: "Industry 4.0 for Mechanical Engineers" (24ME205T) might be pdeu-industry-4-0-department-specific-civil (name 0.50, topics 0.43) or pdeu-industry-4-0-department-specific-ce (name 0.50, topics 0.38) or pdeu-industry-4-0-petro (name 0.50, topics 0.38)
- me sem 5: "Fluid Machinery" (24ME333T) might be pdeu-fluid-mechanics-and-fluid-machinery (name 0.50, topics 0.28)
- me sem 7: "Computer Aided Manufacturing" (24ME438T) might be pdeu-computer-aided-manufacturing-cam-major-in-house (name 0.38, topics 0.57) or pdeu-computer-aided-design (name 0.67, topics 0.04)

</details>

<details><summary>in course table, no handout page (93)</summary>

- biotech sem 2: "Nanotechnology0" (sem 2 in the table) has no handout page and no Prism course
- biotech sem 3: "Biophysics & Structural3" (sem 3 in the table) has no handout page and no Prism course
- biotech sem 3: "Introduction to Artificial3" (sem 3 in the table) has no handout page and no Prism course
- biotech sem 3: "Civic and Social Service0" (sem 3 in the table) has no handout page and no Prism course
- biotech sem 4: "Industry 4.02 (Department Specific)" (sem 4 in the table) has no handout page and no Prism course
- biotech sem 4: "Industry 4.0 - Lab0 (Department Specific)" (sem 4 in the table) has no handout page and no Prism course
- biotech sem 4: "Bioprocess3" (sem 4 in the table) has no handout page and no Prism course
- biotech sem 4: "Bioprocess0" (sem 4 in the table) has no handout page and no Prism course
- biotech sem 4: "Analytical3" (sem 4 in the table) has no handout page and no Prism course
- biotech sem 4: "Analytical0" (sem 4 in the table) has no handout page and no Prism course
- biotech sem 4: "Industrial Orientation" (sem 4 in the table) has no handout page and no Prism course
- biotech sem 5: "Engineering Economics" (sem 5 in the table) has no handout page and no Prism course
- biotech sem 5: "Animal and Plant3" (sem 5 in the table) has no handout page and no Prism course
- biotech sem 5: "Animal and Plant0" (sem 5 in the table) has no handout page and no Prism course
- biotech sem 6: "Molecular3" (sem 6 in the table) has no handout page and no Prism course
- biotech sem 6: "Pharmacokinetics3 and Pharmaco" (sem 6 in the table) has no handout page and no Prism course
- biotech sem 6: "Pharmacology of3" (sem 6 in the table) has no handout page and no Prism course
- biotech sem 6: "Pharmacology of0" (sem 6 in the table) has no handout page and no Prism course
- ce sem 1: "Indian Knowledge System" (sem 1 in the table) matches pdeu-indian-knowledge-system-biotech: link it to ce sem 1?
- ce sem 4: "ESCIntelligence (Department Specific)" (sem ? in the table) has no handout page and no Prism course
- ce sem 4: "Engineering Economics" (sem ? in the table) has no handout page and no Prism course
- ce sem 4: "OE3" (sem ? in the table) has no handout page and no Prism course
- ce sem 4: "Cryptography and Network3" (sem ? in the table) has no handout page and no Prism course
- ce sem 4: "Cryptography and Network0" (sem ? in the table) has no handout page and no Prism course
- ce sem 4: "OE3 th" (sem ? in the table) has no handout page and no Prism course
- ce sem 6: "ESCIntelligence (Department Specific)" (sem 6 in the table) has no handout page and no Prism course
- ce sem 6: "Engineering Economics" (sem 6 in the table) has no handout page and no Prism course
- ce sem 7: "OE3" (sem 7 in the table) has no handout page and no Prism course
- ce sem 7: "Cryptography and Network3" (sem 7 in the table) has no handout page and no Prism course
- ce sem 7: "Cryptography and Network0" (sem 7 in the table) has no handout page and no Prism course
- ce sem 8: "OE3" (sem 8 in the table) has no handout page and no Prism course
- chem sem 1: "Total" (sem 1 in the table) has no handout page and no Prism course
- chem sem 4: "Industrial Orientation" (sem 4 in the table) has no handout page and no Prism course
- chem sem 5: "Total" (sem 5 in the table) has no handout page and no Prism course
- chem sem 6: "Total" (sem 6 in the table) has no handout page and no Prism course
- civil sem 1: "Humanities" (sem 1 in the table) has no handout page and no Prism course
- civil sem 2: "Humanities" (sem 2 in the table) has no handout page and no Prism course
- civil sem 4: "Industrial Orientation 0" (sem 4 in the table) has no handout page and no Prism course
- civil sem 5: "Engineering Economics" (sem 5 in the table) has no handout page and no Prism course
- ece sem 1: "Humanities – 1" (sem 1 in the table) has no handout page and no Prism course
- ece sem 2: "Humanities – 2" (sem 2 in the table) has no handout page and no Prism course
- ece sem 3: "Introduction to Artificial Intelligence (Department Specific)" (sem 3 in the table) matches pdeu-introduction-to-artificial-intelligence-biotech: link it to ece sem 3?
- ece sem 3: "Math-3" (sem 3 in the table) matches pdeu-mathematics-3-civil: link it to ece sem 3?
- ece sem 4: "Industry 4.0 (Department Specific)" (sem 4 in the table) matches pdeu-industry-4-0-department-specific-ce: link it to ece sem 4?
- ece sem 5: "Engineering Economics" (sem 5 in the table) has no handout page and no Prism course
- elec sem 1: "Mathematics – I" (sem 1 in the table) matches pdeu-mathematics-1-ict: link it to elec sem 1?
- elec sem 1: "Elements of Civil Engineering and 20CE101T4" (sem 1 in the table) has no handout page and no Prism course
- elec sem 1: "Engineering" (sem 1 in the table) has no handout page and no Prism course
- elec sem 1: "Engineering0" (sem 1 in the table) has no handout page and no Prism course
- elec sem 1: "Engineering Physics" (sem 1 in the table) matches pdeu-applied-physics: link it to elec sem 1?
- elec sem 2: "Programming with C" (sem 2 in the table) has no handout page and no Prism course
- elec sem 2: "50 25 Programming with C" (sem 2 in the table) has no handout page and no Prism course
- elec sem 2: "Human Values" (sem 2 in the table) has no handout page and no Prism course
- elec sem 2: "Mathematics – II" (sem 2 in the table) matches pdeu-mathematics-2-ict: link it to elec sem 2?
- elec sem 2: "Engineering Chemistry" (sem 2 in the table) matches pdeu-chemistry-ece-civil: link it to elec sem 2?
- elec sem 2: "20ME102T25" (sem 2 in the table) has no handout page and no Prism course
- elec sem 2: "Basic Electronics" (sem 2 in the table) matches pdeu-basic-electronics: link it to elec sem 2?
- elec sem 3: "Fundamentals of0" (sem 3 in the table) has no handout page and no Prism course
- elec sem 3: "20CP102PPython Programming-- -- -- Environmental Studies" (sem 3 in the table) has no handout page and no Prism course
- elec sem 4: "12. 20EE205TGeneration,4" (sem 4 in the table) has no handout page and no Prism course
- elec sem 4: "18. 20EE208PMicrocontrollers0" (sem 4 in the table) has no handout page and no Prism course
- elec sem 4: "22. TP210 Industrial Orientation enrolled in B.Tech. programs of School of Technology other than Electrical Engineering. by the other departments of School of Technology/other schools of university." (sem 4 in the table) has no handout page and no Prism course
- elec sem 5: "24. Communication Skills III enrolled in B.Tech. programs of School of Technology other than Electrical Engineering. the other departments of School of Technology/other schools of university." (sem 5 in the table) has no handout page and no Prism course
- elec sem 6: "TP310 Industrial Training/ IEP2 (6 weeks) (Theory). enrolled in B.Tech. programs of School of Technology other than Electrical Engineering. the other departments of School of Technology/other schools of university." (sem 6 in the table) has no handout page and no Prism course
- elec sem 7: "3Policies and Regulations" (sem 7 in the table) has no handout page and no Prism course
- elec sem 7: "4Course – IV" (sem 7 in the table) has no handout page and no Prism course
- elec sem 7: "6Course – V" (sem 7 in the table) has no handout page and no Prism course
- elec sem 8: "Total" (sem 8 in the table) has no handout page and no Prism course
- ict sem 1: "Humanities – 1" (sem 1 in the table) has no handout page and no Prism course
- ict sem 1: "Workshop Practices" (sem 1 in the table) has no handout page and no Prism course
- ict sem 2: "Humanities – 2" (sem 2 in the table) has no handout page and no Prism course
- ict sem 3: "Introduction to Artificial Intelligence (Department" (sem 3 in the table) matches pdeu-introduction-to-artificial-intelligence-biotech: link it to ict sem 3?
- ict sem 4: "Industry 4.0 (Department Specific)" (sem 4 in the table) matches pdeu-industry-4-0-department-specific-ce: link it to ict sem 4?
- ict sem 4: "Engineering Economics" (sem 4 in the table) has no handout page and no Prism course
- ict sem 4: "VPC" (sem 4 in the table) has no handout page and no Prism course
- ict sem 7: "Engineering Economics" (sem 7 in the table) has no handout page and no Prism course
- ict sem 7: "VPC" (sem 7 in the table) has no handout page and no Prism course
- me sem 1: "English Communication" (sem 1 in the table) matches pdeu-english-communication-ce-biotech: link it to me sem 1?
- me sem 2: "Computer Programming - II" (sem 2 in the table) matches pdeu-computer-programming-ii-ce: link it to me sem 2?
- me sem 2: "7Elements of Electrical and-" (sem 2 in the table) has no handout page and no Prism course
- me sem 2: "24EE101PElectronics Engineering0" (sem 2 in the table) has no handout page and no Prism course
- me sem 2: "Organizational Behaviour" (sem 2 in the table) matches pdeu-organizational-behaviour-biotech: link it to me sem 2?
- me sem 2: "Professional Communication" (sem 2 in the table) matches pdeu-professional-communication-ce-biotech: link it to me sem 2?
- me sem 2: "Total" (sem 2 in the table) has no handout page and no Prism course
- me sem 3: "Introduction to Artificial" (sem 3 in the table) has no handout page and no Prism course
- me sem 5: "COURSE STRUCTURE FOR B.TECH. Mechanical Engineering THIRD YEAR (w. e. f. 2024-25) (Subjects) B.TECH. MECHANICAL ENGINEERING Sem-V NoCodeCodeL T P C Hrs/wkMarks" (sem 5 in the table) has no handout page and no Prism course
- me sem 5: "NPTEL / SWAYAM / MOOC3" (sem 5 in the table) has no handout page and no Prism course
- me sem 5: "MOOC 3 0 0 Course Introduction to Composite" (sem 5 in the table) has no handout page and no Prism course
- me sem 5: "PEEnergy Technologies" (sem 5 in the table) has no handout page and no Prism course
- me sem 6: "PEProduction and Operation3" (sem 6 in the table) has no handout page and no Prism course
- me sem 7: "Total" (sem 7 in the table) has no handout page and no Prism course
- petro sem 2: "Total" (sem 2 in the table) has no handout page and no Prism course
- petro sem 4: "Total" (sem 4 in the table) has no handout page and no Prism course

</details>

<details><summary>not in handouts (handouts incomplete or elective) (9)</summary>

- biotech sem 2: pdeu-yoga-health-and-hygiene-or-nss-or-ncc "Yoga, Health & Hygiene OR NSS OR NCC" is not in the biotech sem 2 handouts
- ce sem 2: pdeu-yoga-health-and-hygiene-or-ncc-or-nss "Yoga, Health & Hygiene OR NCC OR NSS" is not in the ce sem 2 handouts
- me sem 1: pdeu-environmental-studies "Environmental Studies" is not in the me sem 1 handouts
- me sem 2: pdeu-communication-skills-theory "Communication Skills (Theory)" is not in the me sem 2 handouts
- me sem 2: pdeu-professional-ethics-and-human-values "Professional Ethics and Human Values" is not in the me sem 2 handouts
- me sem 8: pdeu-computer-aided-manufacturing-cam-major-in-house "Computer Aided Manufacturing (CAM) [Major in-house project route only]" is not in the me sem 8 handouts
- me sem 8: pdeu-project-management-department-elective-v "Project Management / Department Elective - V" is not in the me sem 8 handouts
- me sem 8: pdeu-thermal-engineering-and-power-plant "Thermal Engineering and Power Plant" is not in the me sem 8 handouts
- petro sem 2: pdeu-yoga-health-and-hygiene-or-nss-or-ncc "Yoga, Health & Hygiene OR NSS OR NCC" is not in the petro sem 2 handouts

</details>
