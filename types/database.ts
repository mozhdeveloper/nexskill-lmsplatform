// Hand-written types matching supabase/migrations/*.sql. Once the project has a live Supabase
// project, regenerate the authoritative version with:
//   npx supabase gen types typescript --linked > types/database.ts
// and reconcile any drift — this file is a starting point, not a substitute for that command.

export type CourseStatus =
  | "draft"
  | "submitted_for_review"
  | "under_review"
  | "approved"
  | "published"
  | "rejected"
  | "unpublished"
  | "archived";

export type LessonType =
  | "video"
  | "rich_text"
  | "image_gallery"
  | "audio"
  | "pdf"
  | "file_download"
  | "presentation"
  | "external_resource"
  | "quiz"
  | "exam"
  | "practical_assignment"
  | "live_class"
  | "discussion"
  | "project"
  | "checklist"
  | "survey";

export type ProgressionRuleType =
  | "open"
  | "sequential"
  | "assignment_gated"
  | "score_gated"
  | "instructor_gated"
  | "date_gated"
  | "cohort_gated";

export type SubmissionStatus = "draft" | "submitted" | "in_review" | "revision_required" | "passed" | "failed";
export type EnrollmentStatus = "active" | "completed" | "expired" | "suspended" | "cancelled";
export type CoachApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "additional_information_required"
  | "approved"
  | "rejected"
  | "suspended";
export type CertificateStatus = "pending" | "issued" | "revoked";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          legal_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          country: string | null;
          timezone: string;
          locale: string;
          status: "active" | "suspended";
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string; display_name: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      roles: {
        Row: { id: string; key: string; label: string };
        Insert: { id?: string; key: string; label: string };
        Update: Partial<{ key: string; label: string }>;
      };
      permissions: {
        Row: { id: string; key: string; description: string; category: string };
        Insert: { id?: string; key: string; description: string; category: string };
        Update: Partial<{ key: string; description: string; category: string }>;
      };
      user_roles: {
        Row: { user_id: string; role_id: string; created_at: string };
        Insert: { user_id: string; role_id: string };
        Update: never;
      };
      coach_applications: {
        Row: {
          id: string;
          applicant_id: string;
          public_name: string;
          legal_name: string;
          country: string;
          bio: string;
          expertise: string[];
          years_experience: number | null;
          qualifications: string | null;
          portfolio_url: string | null;
          social_links: Record<string, string>;
          proposed_categories: string[];
          status: CoachApplicationStatus;
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["coach_applications"]["Row"]> & {
          applicant_id: string;
          public_name: string;
          legal_name: string;
          country: string;
          bio: string;
        };
        Update: Partial<Database["public"]["Tables"]["coach_applications"]["Row"]>;
      };
      coach_profiles: {
        Row: {
          id: string;
          user_id: string;
          application_id: string | null;
          slug: string;
          headline: string | null;
          verified: boolean;
          status: "active" | "suspended";
          default_commission_rate: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["coach_profiles"]["Row"]> & { user_id: string; slug: string };
        Update: Partial<Database["public"]["Tables"]["coach_profiles"]["Row"]>;
      };
      coach_team_members: {
        Row: {
          id: string;
          coach_profile_id: string;
          member_id: string;
          scope_type: "account" | "course" | "cohort" | "module" | "student_group";
          scope_id: string | null;
          permission_keys: string[];
          status: "active" | "revoked";
          invited_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["coach_team_members"]["Row"]> & {
          coach_profile_id: string;
          member_id: string;
          scope_type: "account" | "course" | "cohort" | "module" | "student_group";
        };
        Update: Partial<Database["public"]["Tables"]["coach_team_members"]["Row"]>;
      };
      categories: {
        Row: { id: string; name: string; slug: string; parent_id: string | null };
        Insert: { id?: string; name: string; slug: string; parent_id?: string | null };
        Update: Partial<{ name: string; slug: string; parent_id: string | null }>;
      };
      courses: {
        Row: {
          id: string;
          coach_profile_id: string;
          title: string;
          slug: string;
          subtitle: string | null;
          description: string | null;
          category_id: string | null;
          level: "beginner" | "intermediate" | "advanced" | "all_levels";
          primary_language: string;
          course_type: string;
          pricing_model: "free" | "paid";
          price_amount_minor: number;
          price_currency: string;
          access_duration_days: number | null;
          ai_assistant_enabled: boolean;
          status: CourseStatus;
          thumbnail_media_id: string | null;
          completion_rules: { require_all_required_lessons: boolean; require_all_required_assignments_passed: boolean };
          published_version_id: string | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["courses"]["Row"]> & { coach_profile_id: string; title: string; slug: string };
        Update: Partial<Database["public"]["Tables"]["courses"]["Row"]>;
      };
      course_versions: {
        Row: { id: string; course_id: string; version_number: number; snapshot: unknown; published_at: string; created_by: string | null };
        Insert: { id?: string; course_id: string; version_number: number; snapshot: unknown; created_by?: string | null };
        Update: never;
      };
      course_modules: {
        Row: { id: string; course_id: string; title: string; description: string | null; position: number; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["course_modules"]["Row"]> & { course_id: string; title: string };
        Update: Partial<Database["public"]["Tables"]["course_modules"]["Row"]>;
      };
      lessons: {
        Row: {
          id: string;
          module_id: string;
          title: string;
          position: number;
          lesson_type: LessonType;
          content: Record<string, unknown>;
          assignment_id: string | null;
          estimated_minutes: number | null;
          is_required: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["lessons"]["Row"]> & { module_id: string; title: string; lesson_type: LessonType };
        Update: Partial<Database["public"]["Tables"]["lessons"]["Row"]>;
      };
      progression_rules: {
        Row: {
          id: string;
          course_id: string;
          target_type: "module" | "lesson";
          target_id: string;
          rule_type: ProgressionRuleType;
          config: Record<string, unknown>;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["progression_rules"]["Row"]> & {
          course_id: string;
          target_type: "module" | "lesson";
          target_id: string;
          rule_type: ProgressionRuleType;
        };
        Update: Partial<Database["public"]["Tables"]["progression_rules"]["Row"]>;
      };
      assignments: {
        Row: {
          id: string;
          course_id: string;
          lesson_id: string | null;
          title: string;
          instructions: string;
          demonstration_media_ids: string[];
          reference_file_media_ids: string[];
          required_submission_types: string[];
          max_attempts: number | null;
          due_at: string | null;
          passing_criteria: { type: string; min_total?: number };
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["assignments"]["Row"]> & { course_id: string; title: string; instructions: string };
        Update: Partial<Database["public"]["Tables"]["assignments"]["Row"]>;
      };
      enrollments: {
        Row: {
          id: string;
          student_id: string;
          course_id: string;
          course_version_id: string | null;
          cohort_id: string | null;
          enrollment_source: string;
          started_at: string;
          expires_at: string | null;
          status: EnrollmentStatus;
          completed_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["enrollments"]["Row"]> & {
          student_id: string;
          course_id: string;
          enrollment_source: string;
        };
        Update: Partial<Database["public"]["Tables"]["enrollments"]["Row"]>;
      };
      lesson_progress: {
        Row: { id: string; enrollment_id: string; lesson_id: string; status: "not_started" | "in_progress" | "completed"; completed_at: string | null };
        Insert: Partial<Database["public"]["Tables"]["lesson_progress"]["Row"]> & { enrollment_id: string; lesson_id: string };
        Update: Partial<Database["public"]["Tables"]["lesson_progress"]["Row"]>;
      };
      module_progress: {
        Row: {
          id: string;
          enrollment_id: string;
          module_id: string;
          status: "locked" | "unlocked" | "completed";
          unlocked_at: string | null;
          completed_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["module_progress"]["Row"]> & { enrollment_id: string; module_id: string };
        Update: Partial<Database["public"]["Tables"]["module_progress"]["Row"]>;
      };
      course_progress: {
        Row: { id: string; enrollment_id: string; percent: number; completion_rule_snapshot: unknown; completed_at: string | null };
        Insert: Partial<Database["public"]["Tables"]["course_progress"]["Row"]> & { enrollment_id: string; completion_rule_snapshot: unknown };
        Update: Partial<Database["public"]["Tables"]["course_progress"]["Row"]>;
      };
      submissions: {
        Row: {
          id: string;
          assignment_id: string;
          enrollment_id: string;
          student_id: string;
          attempt_number: number;
          status: SubmissionStatus;
          submitted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["submissions"]["Row"]> & {
          assignment_id: string;
          enrollment_id: string;
          student_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["submissions"]["Row"]>;
      };
      submission_files: {
        Row: { id: string; submission_id: string; media_id: string; submission_type: string };
        Insert: { id?: string; submission_id: string; media_id: string; submission_type: string };
        Update: never;
      };
      submission_reviews: {
        Row: {
          id: string;
          submission_id: string;
          reviewer_id: string;
          decision: "revision_required" | "passed" | "failed";
          written_feedback: string | null;
          rubric_scores: Record<string, number>;
          reviewed_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["submission_reviews"]["Row"]> & {
          submission_id: string;
          reviewer_id: string;
          decision: "revision_required" | "passed" | "failed";
        };
        Update: never;
      };
      certificates: {
        Row: {
          id: string;
          enrollment_id: string;
          certificate_number: string;
          student_id: string;
          course_id: string;
          coach_profile_id: string;
          issued_at: string;
          expires_at: string | null;
          status: CertificateStatus;
          revoked_at: string | null;
          revoked_by: string | null;
          revoked_reason: string | null;
          payload_hash: string;
          pdf_media_id: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["certificates"]["Row"]> & {
          enrollment_id: string;
          certificate_number: string;
          student_id: string;
          course_id: string;
          coach_profile_id: string;
          payload_hash: string;
        };
        Update: Partial<Database["public"]["Tables"]["certificates"]["Row"]>;
      };
      certificate_blockchain_records: {
        Row: {
          id: string;
          certificate_id: string;
          chain: string | null;
          transaction_hash: string | null;
          block_reference: string | null;
          anchored_at: string | null;
          verification_status: "unanchored" | "pending" | "anchored" | "failed";
        };
        Insert: Partial<Database["public"]["Tables"]["certificate_blockchain_records"]["Row"]> & { certificate_id: string };
        Update: Partial<Database["public"]["Tables"]["certificate_blockchain_records"]["Row"]>;
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          target_type: string;
          target_id: string | null;
          previous_state: unknown;
          new_state: unknown;
          ip_address: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]> & { action: string; target_type: string };
        Update: never;
      };
      platform_settings: {
        Row: { id: string; key: string; value: unknown; category: string; is_secret: boolean; updated_at: string };
        Insert: { id?: string; key: string; value: unknown; category: string; is_secret?: boolean };
        Update: Partial<{ value: unknown }>;
      };
      media_assets: {
        Row: {
          id: string;
          owner_id: string | null;
          provider: string;
          provider_asset_id: string | null;
          asset_type: "image" | "video" | "audio" | "document";
          title: string | null;
          duration_seconds: number | null;
          thumbnail_url: string | null;
          processing_status: "pending" | "ready" | "failed";
          storage_bucket: string;
          storage_path: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["media_assets"]["Row"]> & {
          asset_type: "image" | "video" | "audio" | "document";
          storage_bucket: string;
          storage_path: string;
        };
        Update: Partial<Database["public"]["Tables"]["media_assets"]["Row"]>;
      };
    };
  };
}
