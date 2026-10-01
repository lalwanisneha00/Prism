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
};
