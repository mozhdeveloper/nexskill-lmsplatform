"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export interface CourseCardData {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  level: string;
  pricing_model: string;
  coach_profiles: { slug: string; headline: string | null } | null;
}

export function CourseGrid({ courses }: { courses: CourseCardData[] }) {
  if (courses.length === 0) {
    return (
      <Card className="mx-auto max-w-lg text-center">
        <p className="text-sm text-muted">
          No published courses yet. Once an approved coach publishes a course, it will appear here.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course, index) => (
        <motion.div
          key={course.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, delay: Math.min(index, 6) * 0.06, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link href={`/courses/${course.slug}`}>
            <Card hoverable className="group h-full">
              <div className="mb-3 flex items-center justify-between">
                <Badge tone={course.pricing_model === "free" ? "success" : "primary"}>
                  {course.pricing_model === "free" ? "Free" : "Paid"}
                </Badge>
                <Badge>{course.level.replace(/_/g, " ")}</Badge>
              </div>
              <h3 className="font-semibold transition-colors group-hover:text-primary">{course.title}</h3>
              {course.subtitle && <p className="mt-1.5 text-sm leading-relaxed text-muted">{course.subtitle}</p>}
              {course.coach_profiles?.headline && (
                <p className="mt-4 text-xs text-muted">{course.coach_profiles.headline}</p>
              )}
            </Card>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
