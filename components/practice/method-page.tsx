import Link from "next/link";
import type { ReactNode } from "react";

import { Latex } from "@/components/math/latex";
import { PageHeading, PageShell } from "@/components/site/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHOICE_GUESS, DISCRIMINATION } from "@/lib/practice/irt";
import { COURSE_SD, DOMAIN_SD, HALF_LIFE_DAYS, MIN_EVIDENCE, SKILL_SD } from "@/lib/practice/mastery";
import { BLUEPRINTS, ROUTING_THRESHOLD } from "@/lib/practice/mock";
import { auditedTemplateCount, summarizeBank } from "@/lib/practice/registry";
import { scheduleText, streakText } from "@/lib/practice/review";
import { SKILLS } from "@/lib/practice/taxonomy";
import { REPOSITORY_URL, TRADEMARK_NOTICE } from "@/lib/site";

function Section({ id, title, children }: { readonly id: string; readonly title: string; readonly children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <h2 id={`${id}-title`} className="mb-3 text-xl font-semibold tracking-tight">
        {title}
      </h2>
      <div className="space-y-3 leading-relaxed text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}

export function MethodPage() {
  const bank = summarizeBank();
  const audited = auditedTemplateCount();
  const full = BLUEPRINTS.full;
  return (
    <PageShell width="narrow">
      <PageHeading
        title="How it works"
        description="What MathForge measures, how it measures it, and what its numbers do not mean. Written for students, and for anyone who wants to check the reasoning."
      />

      <div className="space-y-10">
        <Section id="questions" title="1. Where the questions come from">
          <p>
            Every question is original. Each of the <strong>{bank.templates} question types</strong> is a small program
            that, given a seed, picks numbers so that the answer comes out clean, writes the question, and writes the
            worked solution alongside it. The same four values — question type, seed, level and format — always rebuild
            exactly the same question, which is how your notebook can store a mistake in a few bytes.
          </p>
          <p>
            Wrong choices are not random numbers. Each one is the result of a specific, named mistake — forgetting to
            flip an inequality, dividing by the new price instead of the original — and that mistake is what you are
            shown if you pick it.
          </p>
          <p>
            <strong>Answer keys are checked independently.</strong> {audited} question types carry a machine-checkable
            statement of why the answer is right. In the test suite, a math engine written from scratch for this site
            evaluates that statement for 30 seeds of every variant — by direct evaluation, numerical differentiation,
            numerical integration or a two-sided limit — and compares it with the key. The same run compiles every
            formula and rejects any question without four distinct choices. A wrong key cannot be merged.
          </p>
        </Section>

        <Section id="model" title="2. The response model">
          <p>
            A question is treated as a three-parameter logistic item. The probability that a student of ability{" "}
            <Latex>{"\\theta"}</Latex> answers it correctly is
          </p>
          <Latex display>{"P(\\text{correct} \\mid \\theta) = c + (1 - c)\\,\\frac{1}{1 + e^{-a(\\theta - b)}}"}</Latex>
          <p>
            where <Latex>{"b"}</Latex> is the difficulty (set by the level: foundational, standard or challenging),{" "}
            <Latex>{`a = ${DISCRIMINATION}`}</Latex> is how sharply the question separates students, and{" "}
            <Latex>{"c"}</Latex> is the chance of guessing it: <Latex>{`${CHOICE_GUESS}`}</Latex> for four choices, 0
            for a typed answer. Ability is estimated by Bayes&rsquo; rule on a grid of 81 values from −4 to 4, so
            every number on the site is an exact posterior calculation rather than an approximation.
          </p>
        </Section>

        <Section id="mastery" title="3. Mastery, and why a few answers are not enough">
          <p>
            Ability is modeled at three nested levels — the course, its domains, and the {SKILLS.length} skills inside
            them:
          </p>
          <Latex display>
            {`\\theta_{\\text{course}} \\sim N(0,\\,${COURSE_SD}^2), \\qquad \\theta_{\\text{domain}} \\sim N(\\theta_{\\text{course}},\\,${DOMAIN_SD}^2), \\qquad \\theta_{\\text{skill}} \\sim N(\\theta_{\\text{domain}},\\,${SKILL_SD}^2)`}
          </Latex>
          <p>
            The consequence is <strong>credibility</strong>, in the sense actuaries use the word. If you have answered
            two questions on circles and got both wrong, the site does not conclude that you cannot do circles. It
            starts from how you do on the rest of geometry and moves away from that only as evidence about circles
            accumulates. With thirty answers, the thirty answers dominate. The posterior is computed exactly, by
            passing messages up and down the three-level tree.
          </p>
          <p>
            <strong>Recent answers count more.</strong> An answer&rsquo;s weight halves every {HALF_LIFE_DAYS} days, so
            the report follows what you can do now.
          </p>
          <p>
            <strong>Uncertainty is shown, not hidden.</strong> The percentage is the estimated probability of answering
            a standard-level question on that skill correctly without guessing. The lighter band on each bar is one
            posterior standard deviation either side. Below {MIN_EVIDENCE} answers&rsquo; worth of evidence, a skill is
            labeled &ldquo;Not enough data&rdquo; and given no number at all.
          </p>
        </Section>

        <Section id="selection" title="4. How the next question is chosen">
          <p>
            Practice uses <strong>Thompson sampling</strong>. For every skill, the site draws one plausible ability from
            that skill&rsquo;s posterior, and practices the skill whose draw came out lowest. Weak skills are chosen
            most often; skills the site is unsure about are still visited, because a wide posterior sometimes produces
            a low draw. The level is then matched to your estimate, aiming for a question you should get right about
            two times in three.
          </p>
          <p>
            Missed questions enter a Leitner notebook and return the same day, then after {scheduleText()}; {streakText()}{" "}
            correct answers in a row clear a card. A card is reviewed with a fresh variant — the same idea with new numbers — so it cannot be passed by
            remembering an answer.
          </p>
        </Section>

        <Section id="mock" title="5. Mock tests and the score estimate">
          <p>
            A full mock test follows the published structure of the digital SAT Math section: two modules of{" "}
            {full.questionsPerModule} questions and {full.secondsPerModule / 60} minutes each, with roughly a quarter of
            the questions answered by typing, and the four content areas in the section&rsquo;s proportions (
            {full.domainQuota["sat-algebra"]} Algebra, {full.domainQuota["sat-advanced"]} Advanced Math,{" "}
            {full.domainQuota["sat-data"]} Problem-Solving and Data Analysis, {full.domainQuota["sat-geometry"]}{" "}
            Geometry and Trigonometry per module).
          </p>
          <p>
            After the first module your ability is estimated from those answers alone. At or above{" "}
            <Latex>{`\\theta = ${ROUTING_THRESHOLD}`}</Latex> you are routed to a second module weighted toward
            challenging questions; below it, toward foundational ones. The final estimate uses all of your answers and
            is mapped linearly onto the 200–800 scale, rounded to the nearest 10.
          </p>
        </Section>

        <Card className="border-warning/40">
          <CardHeader>
            <CardTitle>What these numbers do not mean</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              <strong className="font-medium text-foreground">The item parameters are set by design, not fitted to data.</strong>{" "}
              A testing organization calibrates each question on thousands of students. This site has no server and
              collects no responses, so it cannot. Difficulty comes from the level a question was written at.
            </p>
            <p>
              <strong className="font-medium text-foreground">The score is an unofficial estimate.</strong> It has never
              been equated against real test results. It is useful for comparing your own tests over time; it is not a
              prediction of an official score, and it is always shown with a range for that reason.
            </p>
            <p>
              <strong className="font-medium text-foreground">Coverage is broad, not complete.</strong> The bank spans
              the main skills of each course, but a real exam can ask things that are not here.
            </p>
            <p>
              <strong className="font-medium text-foreground">Your data stays with you.</strong> There are no accounts
              and no analytics on your answers. Progress lives in this browser&rsquo;s storage and can be exported from
              the{" "}
              <Link href="/progress" className="text-primary underline-offset-4 hover:underline">
                Progress
              </Link>{" "}
              page.
            </p>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">
          The full source, including the tests described above, is on{" "}
          <a href={REPOSITORY_URL} target="_blank" rel="noreferrer noopener" className="text-primary underline-offset-4 hover:underline">
            GitHub
          </a>
          . {TRADEMARK_NOTICE}
        </p>
      </div>
    </PageShell>
  );
}
