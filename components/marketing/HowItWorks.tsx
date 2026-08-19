"use client";

import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Learn, step by step",
    description: "Work through structured modules and lessons that unlock as you progress — not a random pile of videos.",
  },
  {
    number: "02",
    title: "Prove it with practice",
    description: "Submit real practical assignments. Your coach reviews the work, gives feedback, and asks for revisions when needed.",
  },
  {
    number: "03",
    title: "Get certified",
    description: "Complete the course and receive a verifiable NexSkill certificate — shareable, checkable, and tied to real work.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="mb-12 text-center"
      >
        <h2 className="text-3xl font-semibold tracking-tight">How NexSkill works</h2>
        <p className="mt-3 text-muted">A learning loop built around actually doing the skill.</p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {steps.map((step, index) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-xl border border-border bg-surface p-6"
          >
            <span className="text-sm font-semibold text-primary">{step.number}</span>
            <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{step.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
