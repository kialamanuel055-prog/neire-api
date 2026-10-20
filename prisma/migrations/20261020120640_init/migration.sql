-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('student', 'alumni', 'company', 'admin');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('declarada', 'comprovada', 'validada');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('pendente', 'em_analise', 'verificada', 'ativa');

-- CreateEnum
CREATE TYPE "OpportunityType" AS ENUM ('estagio', 'emprego', 'formacao', 'bolsa', 'concurso', 'voluntariado', 'mentoria');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('pendente', 'publicada', 'encerrada', 'rejeitada');

-- CreateEnum
CREATE TYPE "Modality" AS ENUM ('presencial', 'remoto', 'hibrido');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('enviada', 'em_analise', 'pre_selecionado', 'entrevista', 'selecionado', 'nao_selecionado');

-- CreateEnum
CREATE TYPE "CourseKind" AS ENUM ('curso', 'workshop', 'bootcamp', 'masterclass');

-- CreateEnum
CREATE TYPE "FeedbackKind" AS ENUM ('evento', 'formacao');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('pendente', 'aprovada', 'rejeitada');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "department" TEXT NOT NULL DEFAULT 'geral',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "userId" TEXT NOT NULL,
    "course" TEXT NOT NULL DEFAULT '',
    "year" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "headline" TEXT NOT NULL DEFAULT '',
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "available" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "level" "SkillLevel" NOT NULL DEFAULT 'declarada',

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "link" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "status" "CompanyStatus" NOT NULL DEFAULT 'pendente',
    "description" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "areas" TEXT NOT NULL DEFAULT '',
    "contactEmail" TEXT NOT NULL DEFAULT '',
    "contactPhone" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Company_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "OpportunityType" NOT NULL,
    "area" TEXT NOT NULL,
    "modality" "Modality" NOT NULL,
    "level" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "vacancies" INTEGER NOT NULL DEFAULT 1,
    "deadline" TIMESTAMP(3) NOT NULL,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'pendente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "status" "ApplicationStatus" NOT NULL DEFAULT 'enviada',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationHistory" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRegistration" (
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("eventId","userId")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "CourseKind" NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "instructor" TEXT NOT NULL DEFAULT '',
    "startDate" TIMESTAMP(3) NOT NULL,
    "hours" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseEnrollment" (
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CourseEnrollment_pkey" PRIMARY KEY ("courseId","userId")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "date" TIMESTAMP(3) NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NewsItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpactStory" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "personName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "story" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ImpactStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "kind" "FeedbackKind" NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetTitle" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ratings" JSONB NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'pendente',
    "resultLevel" "SkillLevel",
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "SkillRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GraduateProfile" (
    "userId" TEXT NOT NULL,
    "graduationYear" TEXT NOT NULL DEFAULT '',
    "company" TEXT NOT NULL DEFAULT '',
    "position" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "offersMentoring" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GraduateProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_profileId_name_key" ON "Skill"("profileId", "name");

-- CreateIndex
CREATE INDEX "Opportunity_status_idx" ON "Opportunity"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Application_opportunityId_studentId_key" ON "Application"("opportunityId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_code_key" ON "Certificate"("code");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_kind_targetId_userId_key" ON "Feedback"("kind", "targetId", "userId");

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "StudentProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "StudentProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationHistory" ADD CONSTRAINT "ApplicationHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillRequest" ADD CONSTRAINT "SkillRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraduateProfile" ADD CONSTRAINT "GraduateProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
