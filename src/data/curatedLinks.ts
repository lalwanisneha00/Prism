import type { Link } from "@/lib/schema";

/**
 * Hand-picked free courses per subject, checked to exist. The AI never writes links;
 * the app adds these (plus the topic's textbook sections) to "Keep learning".
 */
export const curatedVideos: Record<string, Link[]> = {
  em: [
    {
      title: "Physics II: Electricity and Magnetism (8.02), full lecture course",
      url: "https://ocw.mit.edu/courses/8-02-physics-ii-electricity-and-magnetism-spring-2007/",
      publisher: "MIT OpenCourseWare",
      note: "Free university lectures covering the whole of this subject.",
    },
    {
      title: "Electric charge, electric force and voltage",
      url: "https://www.khanacademy.org/science/physics/electric-charge-electric-force-and-voltage",
      publisher: "Khan Academy",
      note: "Short, gentle videos with practice questions.",
    },
  ],
  "engg-math": [
    {
      title: "Single Variable Calculus (18.01SC), full course",
      url: "https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/",
      publisher: "MIT OpenCourseWare",
      note: "Free lectures, notes and problem sets with solutions.",
    },
    {
      title: "Linear Algebra (18.06SC), Gilbert Strang",
      url: "https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/",
      publisher: "MIT OpenCourseWare",
      note: "The classic linear algebra course, with recitation videos.",
    },
    {
      title: "Essence of calculus (video series)",
      url: "https://www.youtube.com/playlist?list=PLZHQObOWTQDMsr9K-rj53DwVRMYO3t5Yr",
      publisher: "3Blue1Brown",
      note: "Beautiful visual intuition for derivatives and integrals.",
    },
    {
      title: "Complex Variables with Applications (18.04)",
      url: "https://ocw.mit.edu/courses/18-04-complex-variables-with-applications-spring-2018/",
      publisher: "MIT OpenCourseWare",
      note: "For the complex variable chapters.",
    },
  ],
  // Wave 3 (V3 · Step 9): each course number checked against its NPTEL syllabus PDF.
  "electrical-machines": [
    {
      title: "Electrical Machines I (NPTEL)",
      url: "https://nptel.ac.in/courses/108105017",
      publisher: "NPTEL",
      note: "Transformers, induction, DC and synchronous machines.",
    },
  ],
  "power-systems": [
    {
      title: "Computer Aided Power System Analysis (Prof. Biswarup Das, IIT Roorkee)",
      url: "https://nptel.ac.in/courses/108107127",
      publisher: "NPTEL",
      note: "Per-unit modelling, load flow, faults and stability.",
    },
  ],
  "power-electronics": [
    {
      title: "Power Electronics (NPTEL)",
      url: "https://nptel.ac.in/courses/108101038",
      publisher: "NPTEL",
      note: "Devices, rectifiers, choppers and inverters.",
    },
  ],
  "control-systems": [
    {
      title: "Control Engineering (Prof. Ramkrishna Pasumarthy, IIT Madras)",
      url: "https://nptel.ac.in/courses/108106098",
      publisher: "NPTEL",
      note: "Modelling, time response, stability and frequency response.",
    },
  ],
  "electrical-measurements": [
    {
      title:
        "Electrical Measurement and Electronic Instruments (Prof. Avishek Chatterjee, IIT Kharagpur)",
      url: "https://nptel.ac.in/courses/108105153",
      publisher: "NPTEL",
      note: "Instruments, bridges, power and energy measurement.",
    },
  ],
  "engineering-thermodynamics": [
    {
      title: "Concepts of Thermodynamics (IIT Kharagpur)",
      url: "https://nptel.ac.in/courses/112105266",
      publisher: "NPTEL",
      note: "Laws of thermodynamics, properties and cycles.",
    },
  ],
  "heat-transfer": [
    {
      title: "Heat and Mass Transfer (NPTEL)",
      url: "https://nptel.ac.in/courses/112101097",
      publisher: "NPTEL",
      note: "Conduction, convection, radiation and heat exchangers.",
    },
  ],
  "fluid-mechanics": [
    {
      title: "Fluid Mechanics (NPTEL)",
      url: "https://nptel.ac.in/courses/112105171",
      publisher: "NPTEL",
      note: "Statics, kinematics, dynamics and pipe flow.",
    },
  ],
  "strength-of-materials": [
    {
      title: "Strength of Materials (Prof. Sriman Kumar Bhattacharyya, IIT Kharagpur)",
      url: "https://nptel.ac.in/courses/105105108",
      publisher: "NPTEL",
      note: "Stress, strain, beams, torsion and columns.",
    },
  ],
  "theory-of-machines": [
    {
      title: "Kinematics of Mechanisms and Machines (Prof. Anirvan DasGupta, IIT Kharagpur)",
      url: "https://nptel.ac.in/courses/112105268",
      publisher: "NPTEL",
      note: "Mechanisms, velocity analysis, cams and gears.",
    },
  ],
  "machine-design": [
    {
      title: "Design of Machine Elements I (NPTEL)",
      url: "https://nptel.ac.in/courses/112105124",
      publisher: "NPTEL",
      note: "Design philosophy, failure theories and machine elements.",
    },
  ],
  "manufacturing-processes": [
    {
      title: "Fundamentals of Manufacturing Processes (Prof. D.K. Dwivedi, IIT Roorkee)",
      url: "https://nptel.ac.in/courses/112107219",
      publisher: "NPTEL",
      note: "Casting, forming, machining and joining.",
    },
  ],
  "engineering-materials": [
    {
      title: "Introduction to Materials Science and Engineering (Prof. Rajesh Prasad, IIT Delhi)",
      url: "https://nptel.ac.in/courses/113102080",
      publisher: "NPTEL",
      note: "Structure, properties, phase diagrams and heat treatment.",
    },
  ],
  "structural-analysis": [
    {
      title: "Structural Analysis I (Prof. Amit Shaw, IIT Kharagpur)",
      url: "https://nptel.ac.in/courses/105105166",
      publisher: "NPTEL",
      note: "Determinate and indeterminate structures.",
    },
  ],
  surveying: [
    {
      title: "Surveying (NPTEL)",
      url: "https://nptel.ac.in/courses/105104101",
      publisher: "NPTEL",
      note: "Levelling, theodolite, curves and modern surveying.",
    },
  ],
  "geotechnical-engineering": [
    {
      title:
        "Soil Mechanics / Geotechnical Engineering I (Prof. Dilip Kumar Baidya, IIT Kharagpur)",
      url: "https://nptel.ac.in/courses/105105168",
      publisher: "NPTEL",
      note: "Soil properties, permeability, consolidation and shear strength.",
    },
  ],
  "concrete-rcc-design": [
    {
      title: "Concrete Technology (Prof. B. Bhattacharjee, IIT Delhi)",
      url: "https://nptel.ac.in/courses/105102012",
      publisher: "NPTEL",
      note: "Ingredients, fresh and hardened concrete, mix design.",
    },
  ],
  "hydraulic-engineering": [
    {
      title: "Hydraulics (NPTEL)",
      url: "https://nptel.ac.in/courses/105103096",
      publisher: "NPTEL",
      note: "Open channel flow, specific energy and hydraulic jump.",
    },
  ],
  "environmental-engineering": [
    {
      title: "Water Supply Engineering (NPTEL)",
      url: "https://nptel.ac.in/courses/105105201",
      publisher: "NPTEL",
      note: "Water demand, treatment and distribution.",
    },
  ],
  "building-materials": [
    {
      title: "Building Materials and Construction (NPTEL, IIT Delhi)",
      url: "https://nptel.ac.in/courses/105102088",
      publisher: "NPTEL",
      note: "Bricks, cement, concrete, timber and steel.",
    },
  ],
  // Wave 2 (V3 · Step 8): each course number checked against its NPTEL syllabus or page.
  dsa: [
    {
      title: "Introduction to Data Structures and Algorithms (Prof. Naveen Garg, IIT Delhi)",
      url: "https://nptel.ac.in/courses/106102064",
      publisher: "NPTEL",
      note: "Lectures on every data structure in the syllabus.",
    },
  ],
  "discrete-maths": [
    {
      title: "Discrete Mathematics (Prof. Sudarshan Iyengar, IIT Ropar)",
      url: "https://nptel.ac.in/courses/106106183",
      publisher: "NPTEL",
      note: "Sets, logic, counting and graphs.",
    },
  ],
  coa: [
    {
      title: "Computer Architecture and Organization (Prof. Indranil Sengupta, IIT Kharagpur)",
      url: "https://nptel.ac.in/courses/106105163",
      publisher: "NPTEL",
      note: "From number representation to pipelines and caches.",
    },
  ],
  "operating-systems": [
    {
      title: "Introduction to Operating Systems (Prof. Chester Rebeiro, IIT Madras)",
      url: "https://nptel.ac.in/courses/106106144",
      publisher: "NPTEL",
      note: "Processes, scheduling, synchronisation and memory.",
    },
  ],
  dbms: [
    {
      title: "Data Base Management System (Prof. Partha Pratim Das, IIT Kharagpur)",
      url: "https://nptel.ac.in/courses/106105175",
      publisher: "NPTEL",
      note: "ER model, SQL, normalisation and transactions.",
    },
  ],
  "computer-networks": [
    {
      title: "Computer Networks (IIT Kharagpur)",
      url: "https://nptel.ac.in/courses/106105081",
      publisher: "NPTEL",
      note: "OSI layers, MAC protocols, routing and transport.",
    },
  ],
  "theory-of-computation": [
    {
      title: "Theory of Computation (Prof. Raghunath Tewari, IIT Kanpur)",
      url: "https://nptel.ac.in/courses/106104148",
      publisher: "NPTEL",
      note: "Automata, grammars, Turing machines and decidability.",
    },
  ],
  "compiler-design": [
    {
      title: "Compiler Design (Prof. Santanu Chattopadhyay, IIT Kharagpur)",
      url: "https://nptel.ac.in/courses/106105190",
      publisher: "NPTEL",
      note: "All phases of a compiler, with parsing in depth.",
    },
  ],
  "software-engineering": [
    {
      title: "Software Engineering (Prof. Rajib Mall, IIT Kharagpur)",
      url: "https://nptel.ac.in/courses/106105182",
      publisher: "NPTEL",
      note: "Life-cycle models, design, testing and project management.",
    },
  ],
  "ai-ml": [
    {
      title: "Introduction to Machine Learning (Prof. Balaraman Ravindran, IIT Madras)",
      url: "https://nptel.ac.in/courses/106106139",
      publisher: "NPTEL",
      note: "Regression, classification, trees, SVMs and neural networks.",
    },
    {
      title: "Artificial Intelligence (IIT Kharagpur)",
      url: "https://nptel.ac.in/courses/106105077",
      publisher: "NPTEL",
      note: "Search, knowledge representation and reasoning.",
    },
  ],
  "digital-logic": [
    {
      title: "Digital Circuits (Prof. Santanu Chattopadhyay, IIT Kharagpur)",
      url: "https://nptel.ac.in/courses/108105113",
      publisher: "NPTEL",
      note: "Combinational and sequential logic design.",
    },
  ],
  "signals-systems": [
    {
      title: "Principles of Signals and Systems (Prof. Aditya K. Jagannatham, IIT Kanpur)",
      url: "https://nptel.ac.in/courses/108104100",
      publisher: "NPTEL",
      note: "Convolution, Fourier, Laplace and z-transforms.",
    },
  ],
  "communication-systems": [
    {
      title: "Analog Communication (NPTEL)",
      url: "https://nptel.ac.in/courses/117105143",
      publisher: "NPTEL",
      note: "AM, FM and noise in analogue systems.",
    },
  ],
  microprocessors: [
    {
      title: "Microprocessors and Microcontrollers (Prof. Santanu Chattopadhyay, IIT Kharagpur)",
      url: "https://nptel.ac.in/courses/108105102",
      publisher: "NPTEL",
      note: "8085, 8086, 8051 and ARM.",
    },
  ],
  "em-theory": [
    {
      title: "Electromagnetic Fields (NPTEL)",
      url: "https://nptel.ac.in/courses/108106073",
      publisher: "NPTEL",
      note: "Fields, Maxwell's equations and waves.",
    },
  ],
  vlsi: [
    {
      title: "VLSI Circuits (NPTEL)",
      url: "https://nptel.ac.in/courses/117106092",
      publisher: "NPTEL",
      note: "CMOS combinational and sequential circuit design.",
    },
  ],
  // Wave 1 (V3 · Step 6): NPTEL first (SPEC §12.3 rule 9); every link was opened and checked.
  "applied-physics": [
    {
      title: "Classical Mechanics (8.01SC), full course",
      url: "https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/",
      publisher: "MIT OpenCourseWare",
      note: "Free lectures and problem sets for the mechanics chapters.",
    },
    {
      title: "Physics III: Vibrations and Waves (8.03SC)",
      url: "https://ocw.mit.edu/courses/8-03sc-physics-iii-vibrations-and-waves-fall-2016/",
      publisher: "MIT OpenCourseWare",
      note: "Oscillations, waves and optics, with worked problems.",
    },
    {
      title: "Quantum Physics I (8.04)",
      url: "https://ocw.mit.edu/courses/8-04-quantum-physics-i-spring-2016/",
      publisher: "MIT OpenCourseWare",
      note: "For the quantum physics chapter.",
    },
  ],
  "engg-chemistry": [
    {
      title: "Engineering Chemistry I (Prof. B.L. Tembe and Prof. K. Mangala Sunder, IIT Bombay)",
      url: "https://nptel.ac.in/courses/122101001",
      publisher: "NPTEL",
      note: "The NPTEL course behind the web-book the AICTE syllabus recommends.",
    },
  ],
  "basic-electrical": [
    {
      title: "Basic Electrical Technology (Prof. L. Umanand, IISc Bangalore)",
      url: "https://nptel.ac.in/courses/108108076",
      publisher: "NPTEL",
      note: "Free video lectures covering circuits, AC, machines and more.",
    },
  ],
  "basic-electronics": [
    {
      title: "Basic Electronics (Prof. M.B. Patil, IIT Bombay)",
      url: "https://nptel.ac.in/courses/108101091",
      publisher: "NPTEL",
      note: "Diodes, transistors, op-amps and digital circuits, with simulations.",
    },
  ],
  "engg-mechanics": [
    {
      title: "Engineering Mechanics (Prof. Manoj K Harbola, IIT Kanpur)",
      url: "https://nptel.ac.in/courses/122104015",
      publisher: "NPTEL",
      note: "Statics and dynamics lectures from the author of a textbook AICTE recommends.",
    },
  ],
  pps: [
    {
      title: "Introduction to Computer Science and Programming in Python (6.0001)",
      url: "https://ocw.mit.edu/courses/6-0001-introduction-to-computer-science-and-programming-in-python-fall-2016/",
      publisher: "MIT OpenCourseWare",
      note: "Free lectures and problem sets for the Python chapter.",
    },
  ],
};
