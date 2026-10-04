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
