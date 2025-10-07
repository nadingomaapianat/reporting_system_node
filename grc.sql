-- --------------------------------------------------------
-- Host:                         206.189.57.0
-- Server version:               Microsoft SQL Server 2017 (RTM-CU31-GDR) (KB5029376) - 14.0.3465.1
-- Server OS:                    Linux (CentOS Linux 7 (Core))
-- HeidiSQL Version:             12.10.0.7000
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES  */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for NEWDCC-V4-UAT
CREATE DATABASE IF NOT EXISTS "NEWDCC-V4-UAT";
USE "NEWDCC-V4-UAT";

-- Dumping structure for table NEWDCC-V4-UAT.ab_permission
CREATE TABLE IF NOT EXISTS "ab_permission" (
	"id" INT NOT NULL,
	"name" VARCHAR(100) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	PRIMARY KEY ("id"),
	UNIQUE INDEX "UQ__ab_permi__72E12F1B5B8B02A7" ("name")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ab_permission_view
CREATE TABLE IF NOT EXISTS "ab_permission_view" (
	"id" INT NOT NULL,
	"permission_id" INT NULL DEFAULT NULL,
	"view_menu_id" INT NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	UNIQUE INDEX "UQ__ab_permi__B9EBDF8D40372DC7" ("permission_id", "view_menu_id"),
	FOREIGN KEY INDEX "FK__ab_permis__permi__2759D01A" ("permission_id"),
	FOREIGN KEY INDEX "FK__ab_permis__view___284DF453" ("view_menu_id"),
	CONSTRAINT "FK__ab_permis__permi__2759D01A" FOREIGN KEY ("permission_id") REFERENCES "ab_permission" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__ab_permis__view___284DF453" FOREIGN KEY ("view_menu_id") REFERENCES "ab_view_menu" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ab_permission_view_role
CREATE TABLE IF NOT EXISTS "ab_permission_view_role" (
	"id" INT NOT NULL,
	"permission_view_id" INT NULL DEFAULT NULL,
	"role_id" INT NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	UNIQUE INDEX "UQ__ab_permi__482F8A8C3D23DF65" ("permission_view_id", "role_id"),
	FOREIGN KEY INDEX "FK__ab_permis__permi__32CB82C6" ("permission_view_id"),
	FOREIGN KEY INDEX "FK__ab_permis__role___33BFA6FF" ("role_id"),
	CONSTRAINT "FK__ab_permis__permi__32CB82C6" FOREIGN KEY ("permission_view_id") REFERENCES "ab_permission_view" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__ab_permis__role___33BFA6FF" FOREIGN KEY ("role_id") REFERENCES "ab_role" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ab_register_user
CREATE TABLE IF NOT EXISTS "ab_register_user" (
	"id" INT NOT NULL,
	"first_name" VARCHAR(64) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"last_name" VARCHAR(64) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"username" VARCHAR(64) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"password" VARCHAR(256) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"email" VARCHAR(64) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"registration_date" DATETIME NULL DEFAULT NULL,
	"registration_hash" VARCHAR(256) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	PRIMARY KEY ("id"),
	UNIQUE INDEX "UQ__ab_regis__F3DBC5728E3910B7" ("username")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ab_role
CREATE TABLE IF NOT EXISTS "ab_role" (
	"id" INT NOT NULL,
	"name" VARCHAR(64) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	PRIMARY KEY ("id"),
	UNIQUE INDEX "UQ__ab_role__72E12F1BDDBDBDC9" ("name")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ab_user
CREATE TABLE IF NOT EXISTS "ab_user" (
	"id" INT NOT NULL,
	"first_name" VARCHAR(64) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"last_name" VARCHAR(64) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"username" VARCHAR(64) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"password" VARCHAR(256) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"active" BIT NULL DEFAULT NULL,
	"email" VARCHAR(320) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"last_login" DATETIME NULL DEFAULT NULL,
	"login_count" INT NULL DEFAULT NULL,
	"fail_login_count" INT NULL DEFAULT NULL,
	"created_on" DATETIME NULL DEFAULT NULL,
	"changed_on" DATETIME NULL DEFAULT NULL,
	"created_by_fk" INT NULL DEFAULT NULL,
	"changed_by_fk" INT NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	UNIQUE INDEX "UQ__ab_user__AB6E61647180A2AC" ("email"),
	UNIQUE INDEX "UQ__ab_user__F3DBC5720B8FC406" ("username"),
	FOREIGN KEY INDEX "FK__ab_user__created__1DD065E0" ("created_by_fk"),
	FOREIGN KEY INDEX "FK__ab_user__changed__1EC48A19" ("changed_by_fk"),
	CONSTRAINT "FK__ab_user__created__1DD065E0" FOREIGN KEY ("created_by_fk") REFERENCES "ab_user" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__ab_user__changed__1EC48A19" FOREIGN KEY ("changed_by_fk") REFERENCES "ab_user" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ab_user_role
CREATE TABLE IF NOT EXISTS "ab_user_role" (
	"id" INT NOT NULL,
	"user_id" INT NULL DEFAULT NULL,
	"role_id" INT NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	UNIQUE INDEX "UQ__ab_user___6EDEA1521A7D0E1B" ("role_id", "user_id"),
	FOREIGN KEY INDEX "FK__ab_user_r__user___2D12A970" ("user_id"),
	FOREIGN KEY INDEX "FK__ab_user_r__role___2E06CDA9" ("role_id"),
	CONSTRAINT "FK__ab_user_r__user___2D12A970" FOREIGN KEY ("user_id") REFERENCES "ab_user" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__ab_user_r__role___2E06CDA9" FOREIGN KEY ("role_id") REFERENCES "ab_role" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ab_view_menu
CREATE TABLE IF NOT EXISTS "ab_view_menu" (
	"id" INT NOT NULL,
	"name" VARCHAR(250) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	PRIMARY KEY ("id"),
	UNIQUE INDEX "UQ__ab_view___72E12F1BF5C617A6" ("name")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ActionplanFiles
CREATE TABLE IF NOT EXISTS "ActionplanFiles" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"actionplan_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"src" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	FOREIGN KEY INDEX "FK__Actionpla__actio__3552E9B6" ("actionplan_id"),
	PRIMARY KEY ("id"),
	CONSTRAINT "FK__Actionpla__actio__3552E9B6" FOREIGN KEY ("actionplan_id") REFERENCES "Actionplans" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.Actionplans
CREATE TABLE IF NOT EXISTS "Actionplans" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"controlDesignTest_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"incident_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"kri_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"factor" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"riskType" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"control_procedure" NVARCHAR(4000) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"type" NVARCHAR(255) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"responsible" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"actionOwner" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"expected_cost" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"business_unit" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"meeting_date" DATETIMEOFFSET NULL DEFAULT NULL,
	"implementation_date" DATETIMEOFFSET NULL DEFAULT NULL,
	"not_attend" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"year" INT NULL DEFAULT '(0)',
	"month" INT NULL DEFAULT '(0)',
	"index" INT NULL DEFAULT '(0)',
	"Boundary_event" BIT NOT NULL DEFAULT '(0)',
	"done" BIT NOT NULL DEFAULT '(0)',
	"from" NVARCHAR(255) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"modifiedBy" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"created_by" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"preparerStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"preparerId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"checkerStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"checkerComment" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"checkerId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"reviewerStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"reviewerComment" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"reviewerId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"acceptanceStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"acceptanceComment" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"acceptanceId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	"preparerStart" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"doneAT" DATETIMEOFFSET NULL DEFAULT NULL,
	FOREIGN KEY INDEX "FK__Actionpla__accep__36470DEF" ("acceptanceId"),
	FOREIGN KEY INDEX "FK__Actionpla__accep__373B3228" ("acceptanceId"),
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__Actionpla__actio__382F5661" ("actionOwner"),
	FOREIGN KEY INDEX "FK__Actionpla__check__39237A9A" ("checkerId"),
	FOREIGN KEY INDEX "FK__Actionpla__check__3A179ED3" ("checkerId"),
	FOREIGN KEY INDEX "FK__Actionpla__contr__3B0BC30C" ("controlDesignTest_id"),
	FOREIGN KEY INDEX "FK__Actionpla__creat__3BFFE745" ("created_by"),
	FOREIGN KEY INDEX "FK__Actionpla__creat__3CF40B7E" ("created_by"),
	FOREIGN KEY INDEX "FK__Actionpla__incid__3DE82FB7" ("incident_id"),
	FOREIGN KEY INDEX "FK__Actionpla__kri_i__3EDC53F0" ("kri_id"),
	FOREIGN KEY INDEX "FK__Actionpla__modif__3FD07829" ("modifiedBy"),
	FOREIGN KEY INDEX "FK__Actionpla__prepa__40C49C62" ("preparerId"),
	FOREIGN KEY INDEX "FK__Actionpla__prepa__41B8C09B" ("preparerId"),
	FOREIGN KEY INDEX "FK__Actionpla__respo__42ACE4D4" ("responsible"),
	FOREIGN KEY INDEX "FK__Actionpla__revie__43A1090D" ("reviewerId"),
	FOREIGN KEY INDEX "FK__Actionpla__revie__44952D46" ("reviewerId"),
	CONSTRAINT "FK__Actionpla__contr__3B0BC30C" FOREIGN KEY ("controlDesignTest_id") REFERENCES "ControlDesignTests" ("id") ON UPDATE NO_ACTION ON DELETE SET_NULL,
	CONSTRAINT "FK__Actionpla__incid__3DE82FB7" FOREIGN KEY ("incident_id") REFERENCES "Incidents" ("id") ON UPDATE NO_ACTION ON DELETE SET_NULL,
	CONSTRAINT "FK__Actionpla__kri_i__3EDC53F0" FOREIGN KEY ("kri_id") REFERENCES "Kris" ("id") ON UPDATE NO_ACTION ON DELETE SET_NULL,
	CONSTRAINT "FK__Actionpla__respo__42ACE4D4" FOREIGN KEY ("responsible") REFERENCES "JobTitles" ("id") ON UPDATE NO_ACTION ON DELETE SET_NULL,
	CONSTRAINT "FK__Actionpla__actio__382F5661" FOREIGN KEY ("actionOwner") REFERENCES "Functions" ("id") ON UPDATE NO_ACTION ON DELETE SET_NULL,
	CONSTRAINT "FK__Actionpla__modif__3FD07829" FOREIGN KEY ("modifiedBy") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE SET_NULL,
	CONSTRAINT "FK__Actionpla__creat__3BFFE745" FOREIGN KEY ("created_by") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Actionpla__creat__3CF40B7E" FOREIGN KEY ("created_by") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Actionpla__prepa__40C49C62" FOREIGN KEY ("preparerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Actionpla__prepa__41B8C09B" FOREIGN KEY ("preparerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Actionpla__check__39237A9A" FOREIGN KEY ("checkerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Actionpla__check__3A179ED3" FOREIGN KEY ("checkerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Actionpla__revie__43A1090D" FOREIGN KEY ("reviewerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Actionpla__revie__44952D46" FOREIGN KEY ("reviewerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Actionpla__accep__36470DEF" FOREIGN KEY ("acceptanceId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Actionpla__accep__373B3228" FOREIGN KEY ("acceptanceId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "CK__Actionpla__accep__4AD81681" CHECK (([acceptanceStatus]=N'refused' OR [acceptanceStatus]=N'approved' OR [acceptanceStatus]=N'pending')),
	CONSTRAINT "CK__Actionpla__accep__4BCC3ABA" CHECK (([acceptanceStatus]=N'refused' OR [acceptanceStatus]=N'approved' OR [acceptanceStatus]=N'pending')),
	CONSTRAINT "CK__Actionpla__check__4CC05EF3" CHECK (([checkerStatus]=N'refused' OR [checkerStatus]=N'approved' OR [checkerStatus]=N'pending')),
	CONSTRAINT "CK__Actionpla__check__4DB4832C" CHECK (([checkerStatus]=N'refused' OR [checkerStatus]=N'approved' OR [checkerStatus]=N'pending')),
	CONSTRAINT "CK__Actionpla__prepa__4EA8A765" CHECK (([preparerStatus]=N'sent' OR [preparerStatus]=N'draft')),
	CONSTRAINT "CK__Actionpla__prepa__4F9CCB9E" CHECK (([preparerStatus]=N'sent' OR [preparerStatus]=N'draft')),
	CONSTRAINT "CK__Actionpla__revie__5090EFD7" CHECK (([reviewerStatus]=N'sent' OR [reviewerStatus]=N'pending')),
	CONSTRAINT "CK__Actionpla__revie__51851410" CHECK (([reviewerStatus]=N'sent' OR [reviewerStatus]=N'pending'))
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.Activities
CREATE TABLE IF NOT EXISTS "Activities" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"description" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"isDeleted" BIT NOT NULL DEFAULT '(0)',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.AdequateFiles
CREATE TABLE IF NOT EXISTS "AdequateFiles" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"test_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"src" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__AdequateF__test___4589517F" ("test_id"),
	CONSTRAINT "FK__AdequateF__test___4589517F" FOREIGN KEY ("test_id") REFERENCES "ControlDesignTests" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.AdequateFindings
CREATE TABLE IF NOT EXISTS "AdequateFindings" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"controlDesignTest_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"factor" NVARCHAR(255) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"response" NVARCHAR(4000) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"finding" NVARCHAR(4000) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"root_cause_description" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Adequate" BIT NULL DEFAULT NULL,
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__AdequateF__contr__467D75B8" ("controlDesignTest_id"),
	CONSTRAINT "FK__AdequateF__contr__467D75B8" FOREIGN KEY ("controlDesignTest_id") REFERENCES "ControlDesignTests" ("id") ON UPDATE NO_ACTION ON DELETE SET_NULL
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.Assertions
CREATE TABLE IF NOT EXISTS "Assertions" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"coding" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"C" BIT NULL DEFAULT NULL,
	"E" BIT NULL DEFAULT NULL,
	"A" BIT NULL DEFAULT NULL,
	"V" BIT NULL DEFAULT NULL,
	"O" BIT NULL DEFAULT NULL,
	"P" BIT NULL DEFAULT NULL,
	"account_type" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	"isDeleted" BIT NULL DEFAULT '(0)',
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.BankQuestionControls
CREATE TABLE IF NOT EXISTS "BankQuestionControls" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"bank_question_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"control_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__BankQuest__bank___477199F1" ("bank_question_id"),
	FOREIGN KEY INDEX "FK__BankQuest__contr__4865BE2A" ("control_id"),
	CONSTRAINT "FK__BankQuest__bank___477199F1" FOREIGN KEY ("bank_question_id") REFERENCES "BankQuestions" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE,
	CONSTRAINT "FK__BankQuest__contr__4865BE2A" FOREIGN KEY ("control_id") REFERENCES "Controls" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.BankQuestionRisks
CREATE TABLE IF NOT EXISTS "BankQuestionRisks" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"bank_question_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"risk_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__BankQuest__bank___4959E263" ("bank_question_id"),
	FOREIGN KEY INDEX "FK__BankQuest__risk___4A4E069C" ("risk_id"),
	FOREIGN KEY INDEX "FK__BankQuest__risk___4B422AD5" ("risk_id"),
	CONSTRAINT "FK__BankQuest__bank___4959E263" FOREIGN KEY ("bank_question_id") REFERENCES "BankQuestions" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE,
	CONSTRAINT "FK__BankQuest__risk___4A4E069C" FOREIGN KEY ("risk_id") REFERENCES "Risks" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__BankQuest__risk___4B422AD5" FOREIGN KEY ("risk_id") REFERENCES "Risks" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.BankQuestions
CREATE TABLE IF NOT EXISTS "BankQuestions" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"code" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"question_en" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"question_ar" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"reference_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"categoryId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"question_type" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"choices" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"index_in_survey" INT NULL DEFAULT NULL,
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	"explanations" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__BankQuest__categ__4C364F0E" ("categoryId"),
	FOREIGN KEY INDEX "FK__BankQuest__categ__4D2A7347" ("categoryId"),
	FOREIGN KEY INDEX "FK__BankQuest__refer__4E1E9780" ("reference_id"),
	FOREIGN KEY INDEX "FK__BankQuest__refer__4F12BBB9" ("reference_id"),
	UNIQUE INDEX "UQ__BankQues__357D4CF90B3D8FB9" ("code"),
	CONSTRAINT "FK__BankQuest__refer__4E1E9780" FOREIGN KEY ("reference_id") REFERENCES "ControlReferences" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__BankQuest__refer__4F12BBB9" FOREIGN KEY ("reference_id") REFERENCES "ControlReferences" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__BankQuest__categ__4C364F0E" FOREIGN KEY ("categoryId") REFERENCES "Categories" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__BankQuest__categ__4D2A7347" FOREIGN KEY ("categoryId") REFERENCES "Categories" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "CK__BankQuest__quest__52793849" CHECK (([question_type]=N'risk_related' OR [question_type]=N'compliance_related' OR [question_type]=N'single_choice' OR [question_type]=N'multiple_choice' OR [question_type]=N'textarea')),
	CONSTRAINT "CK__BankQuest__quest__536D5C82" CHECK (([question_type]=N'risk_related' OR [question_type]=N'compliance_related' OR [question_type]=N'single_choice' OR [question_type]=N'multiple_choice' OR [question_type]=N'textarea'))
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.BankQuestionSurveys
CREATE TABLE IF NOT EXISTS "BankQuestionSurveys" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"publicSurveyId" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"bankQuestionId" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__BankQuest__bankQ__5006DFF2" ("bankQuestionId"),
	FOREIGN KEY INDEX "FK__BankQuest__publi__50FB042B" ("publicSurveyId"),
	CONSTRAINT "FK__BankQuest__publi__50FB042B" FOREIGN KEY ("publicSurveyId") REFERENCES "PublicSurveys" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE,
	CONSTRAINT "FK__BankQuest__bankQ__5006DFF2" FOREIGN KEY ("bankQuestionId") REFERENCES "BankQuestions" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.blocked_tokens
CREATE TABLE IF NOT EXISTS "blocked_tokens" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"token" NVARCHAR(max) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"userId" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"blockedAt" DATETIMEOFFSET NOT NULL,
	"expiresAt" DATETIMEOFFSET NOT NULL,
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.BusinessUnits
CREATE TABLE IF NOT EXISTS "BusinessUnits" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(255) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"description" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.Catalogs
CREATE TABLE IF NOT EXISTS "Catalogs" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"pagename" NVARCHAR(255) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"userId" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"settings" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__Catalogs__userId__51EF2864" ("userId"),
	FOREIGN KEY INDEX "FK__Catalogs__userId__52E34C9D" ("userId"),
	CONSTRAINT "FK__Catalogs__userId__51EF2864" FOREIGN KEY ("userId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Catalogs__userId__52E34C9D" FOREIGN KEY ("userId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.Categories
CREATE TABLE IF NOT EXISTS "Categories" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"description" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"isDeleted" BIT NOT NULL DEFAULT '(0)',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.CBEDomains
CREATE TABLE IF NOT EXISTS "CBEDomains" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"function_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__CBEDomain__funct__53D770D6" ("function_id"),
	FOREIGN KEY INDEX "FK__CBEDomain__funct__54CB950F" ("function_id"),
	CONSTRAINT "FK__CBEDomain__funct__53D770D6" FOREIGN KEY ("function_id") REFERENCES "CBEFunctions" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__CBEDomain__funct__54CB950F" FOREIGN KEY ("function_id") REFERENCES "CBEFunctions" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.CBEFunctions
CREATE TABLE IF NOT EXISTS "CBEFunctions" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.CobitDomains
CREATE TABLE IF NOT EXISTS "CobitDomains" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.CobitPractices
CREATE TABLE IF NOT EXISTS "CobitPractices" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"process_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__CobitPrac__proce__55BFB948" ("process_id"),
	CONSTRAINT "FK__CobitPrac__proce__55BFB948" FOREIGN KEY ("process_id") REFERENCES "CobitProcesses" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.CobitProcesses
CREATE TABLE IF NOT EXISTS "CobitProcesses" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"domain_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__CobitProc__domai__56B3DD81" ("domain_id"),
	FOREIGN KEY INDEX "FK__CobitProc__domai__57A801BA" ("domain_id"),
	CONSTRAINT "FK__CobitProc__domai__56B3DD81" FOREIGN KEY ("domain_id") REFERENCES "CobitDomains" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__CobitProc__domai__57A801BA" FOREIGN KEY ("domain_id") REFERENCES "CobitDomains" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ComplianceControlActionFiles
CREATE TABLE IF NOT EXISTS "ComplianceControlActionFiles" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"compliance_control_action_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"src" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"text" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"parentId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"questionId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__Complianc__compl__589C25F3" ("compliance_control_action_id"),
	FOREIGN KEY INDEX "FK__Complianc__compl__59904A2C" ("compliance_control_action_id"),
	FOREIGN KEY INDEX "FK__Complianc__paren__5A846E65" ("parentId"),
	FOREIGN KEY INDEX "FK__Complianc__paren__5B78929E" ("parentId"),
	FOREIGN KEY INDEX "FK__Complianc__quest__5C6CB6D7" ("questionId"),
	CONSTRAINT "FK__Complianc__compl__589C25F3" FOREIGN KEY ("compliance_control_action_id") REFERENCES "ComplianceControlActions" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Complianc__compl__59904A2C" FOREIGN KEY ("compliance_control_action_id") REFERENCES "ComplianceControlActions" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Complianc__paren__5A846E65" FOREIGN KEY ("parentId") REFERENCES "ComplianceControlActionFolders" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Complianc__paren__5B78929E" FOREIGN KEY ("parentId") REFERENCES "ComplianceControlActionFolders" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Complianc__quest__5C6CB6D7" FOREIGN KEY ("questionId") REFERENCES "BankQuestions" ("id") ON UPDATE NO_ACTION ON DELETE SET_NULL
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ComplianceControlActionFolders
CREATE TABLE IF NOT EXISTS "ComplianceControlActionFolders" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"compliance_control_action_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"questionId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"parentId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__Complianc__compl__5D60DB10" ("compliance_control_action_id"),
	FOREIGN KEY INDEX "FK__Complianc__compl__5E54FF49" ("compliance_control_action_id"),
	FOREIGN KEY INDEX "FK__Complianc__paren__5F492382" ("parentId"),
	FOREIGN KEY INDEX "FK__Complianc__paren__603D47BB" ("parentId"),
	FOREIGN KEY INDEX "FK__Complianc__quest__61316BF4" ("questionId"),
	CONSTRAINT "FK__Complianc__compl__5D60DB10" FOREIGN KEY ("compliance_control_action_id") REFERENCES "ComplianceControlActions" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Complianc__compl__5E54FF49" FOREIGN KEY ("compliance_control_action_id") REFERENCES "ComplianceControlActions" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Complianc__quest__61316BF4" FOREIGN KEY ("questionId") REFERENCES "BankQuestions" ("id") ON UPDATE NO_ACTION ON DELETE SET_NULL,
	CONSTRAINT "FK__Complianc__paren__5F492382" FOREIGN KEY ("parentId") REFERENCES "ComplianceControlActionFolders" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Complianc__paren__603D47BB" FOREIGN KEY ("parentId") REFERENCES "ComplianceControlActionFolders" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ComplianceControlActions
CREATE TABLE IF NOT EXISTS "ComplianceControlActions" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"compliance_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"domain_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"control_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"due_date" DATETIMEOFFSET NULL DEFAULT NULL,
	"status" NVARCHAR(255) NOT NULL DEFAULT 'N''Not Started''' COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"compliance_status" NVARCHAR(255) NOT NULL DEFAULT 'N''Not Implemented''' COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"assign_to_manager" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"justification" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"evidence" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"assign_to_implementer" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	"approval_status" NVARCHAR(255) NULL DEFAULT 'N''draft''' COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"approved_by" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"sent_by" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__Complianc__assig__6225902D" ("assign_to_implementer"),
	FOREIGN KEY INDEX "FK__Complianc__assig__6319B466" ("assign_to_manager"),
	FOREIGN KEY INDEX "FK__Complianc__assig__640DD89F" ("assign_to_implementer"),
	FOREIGN KEY INDEX "FK__Complianc__compl__6501FCD8" ("compliance_id"),
	FOREIGN KEY INDEX "FK__Complianc__compl__65F62111" ("compliance_id"),
	FOREIGN KEY INDEX "FK__Complianc__contr__66EA454A" ("control_id"),
	FOREIGN KEY INDEX "FK__Complianc__domai__67DE6983" ("domain_id"),
	FOREIGN KEY INDEX "FK__Complianc__domai__68D28DBC" ("domain_id"),
	CONSTRAINT "FK__Complianc__compl__6501FCD8" FOREIGN KEY ("compliance_id") REFERENCES "Compliances" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Complianc__compl__65F62111" FOREIGN KEY ("compliance_id") REFERENCES "Compliances" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Complianc__domai__67DE6983" FOREIGN KEY ("domain_id") REFERENCES "Domains" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Complianc__domai__68D28DBC" FOREIGN KEY ("domain_id") REFERENCES "Domains" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Complianc__contr__66EA454A" FOREIGN KEY ("control_id") REFERENCES "Controls" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE,
	CONSTRAINT "FK__Complianc__assig__6319B466" FOREIGN KEY ("assign_to_manager") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE SET_NULL,
	CONSTRAINT "FK__Complianc__assig__6225902D" FOREIGN KEY ("assign_to_implementer") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Complianc__assig__640DD89F" FOREIGN KEY ("assign_to_implementer") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ComplianceControlActionsComments
CREATE TABLE IF NOT EXISTS "ComplianceControlActionsComments" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"compliance_control_action_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"comment" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"user_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__Complianc__compl__69C6B1F5" ("compliance_control_action_id"),
	FOREIGN KEY INDEX "FK__Complianc__user___6ABAD62E" ("user_id"),
	FOREIGN KEY INDEX "FK__Complianc__user___6BAEFA67" ("user_id"),
	CONSTRAINT "FK__Complianc__compl__69C6B1F5" FOREIGN KEY ("compliance_control_action_id") REFERENCES "ComplianceControlActions" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE,
	CONSTRAINT "FK__Complianc__user___6ABAD62E" FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Complianc__user___6BAEFA67" FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.complianceReferences
CREATE TABLE IF NOT EXISTS "complianceReferences" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"compliance_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"reference_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__complianc__compl__6CA31EA0" ("compliance_id"),
	FOREIGN KEY INDEX "FK__complianc__compl__6D9742D9" ("compliance_id"),
	FOREIGN KEY INDEX "FK__complianc__refer__6E8B6712" ("reference_id"),
	CONSTRAINT "FK__complianc__compl__6CA31EA0" FOREIGN KEY ("compliance_id") REFERENCES "Compliances" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__complianc__compl__6D9742D9" FOREIGN KEY ("compliance_id") REFERENCES "Compliances" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__complianc__refer__6E8B6712" FOREIGN KEY ("reference_id") REFERENCES "ControlReferences" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.Compliances
CREATE TABLE IF NOT EXISTS "Compliances" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"code" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"complianceItem_en" NVARCHAR(255) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"complianceItem_ar" NVARCHAR(255) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"description_en" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"description_ar" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"complianceStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"progress" DECIMAL(5,2) NULL DEFAULT '(0)',
	"progressStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"quarter" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"year" INT NULL DEFAULT NULL,
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	"approval_status" NVARCHAR(255) NULL DEFAULT 'N''draft''' COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdBy" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	FOREIGN KEY INDEX "fk_compliances_createdBy" ("createdBy"),
	PRIMARY KEY ("id"),
	UNIQUE INDEX "UQ__Complian__357D4CF9FEB44725" ("code"),
	CONSTRAINT "fk_compliances_createdBy" FOREIGN KEY ("createdBy") REFERENCES "Users" ("id") ON UPDATE CASCADE ON DELETE SET_NULL,
	CONSTRAINT "CK__Complianc__compl__546180BB" CHECK (([complianceStatus]=N'Draft' OR [complianceStatus]=N'Published')),
	CONSTRAINT "CK__Complianc__compl__5555A4F4" CHECK (([complianceStatus]=N'Draft' OR [complianceStatus]=N'Published')),
	CONSTRAINT "CK__Complianc__progr__5649C92D" CHECK (([progressStatus]=N'Partially Implemented' OR [progressStatus]=N'Not Implemented' OR [progressStatus]=N'N/A' OR [progressStatus]=N'Mostly Implemented' OR [progressStatus]=N'Fully Implemented' OR [progressStatus]=N'Bank Response' OR [progressStatus]=N'Averagely Implemented')),
	CONSTRAINT "CK__Complianc__progr__573DED66" CHECK (([progressStatus]=N'Partially Implemented' OR [progressStatus]=N'Not Implemented' OR [progressStatus]=N'N/A' OR [progressStatus]=N'Mostly Implemented' OR [progressStatus]=N'Fully Implemented' OR [progressStatus]=N'Bank Response' OR [progressStatus]=N'Averagely Implemented'))
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ControlCBEs
CREATE TABLE IF NOT EXISTS "ControlCBEs" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"cbe_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"control_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__ControlCB__cbe_i__6F7F8B4B" ("cbe_id"),
	FOREIGN KEY INDEX "FK__ControlCB__cbe_i__7073AF84" ("cbe_id"),
	FOREIGN KEY INDEX "FK__ControlCB__contr__7167D3BD" ("control_id"),
	CONSTRAINT "FK__ControlCB__cbe_i__6F7F8B4B" FOREIGN KEY ("cbe_id") REFERENCES "CBEDomains" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__ControlCB__cbe_i__7073AF84" FOREIGN KEY ("cbe_id") REFERENCES "CBEDomains" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__ControlCB__contr__7167D3BD" FOREIGN KEY ("control_id") REFERENCES "Controls" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ControlCobits
CREATE TABLE IF NOT EXISTS "ControlCobits" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"cobit_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"control_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__ControlCo__cobit__725BF7F6" ("cobit_id"),
	FOREIGN KEY INDEX "FK__ControlCo__cobit__73501C2F" ("cobit_id"),
	FOREIGN KEY INDEX "FK__ControlCo__contr__74444068" ("control_id"),
	CONSTRAINT "FK__ControlCo__cobit__725BF7F6" FOREIGN KEY ("cobit_id") REFERENCES "CobitPractices" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__ControlCo__cobit__73501C2F" FOREIGN KEY ("cobit_id") REFERENCES "CobitPractices" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__ControlCo__contr__74444068" FOREIGN KEY ("control_id") REFERENCES "Controls" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ControlControlReferences
CREATE TABLE IF NOT EXISTS "ControlControlReferences" (
	"controlId" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"controlReferenceId" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	PRIMARY KEY ("controlId", "controlReferenceId"),
	FOREIGN KEY INDEX "FK__ControlCo__contr__753864A1" ("controlId"),
	FOREIGN KEY INDEX "FK__ControlCo__contr__762C88DA" ("controlReferenceId"),
	UNIQUE INDEX "ControlControlReferences_controlReferenceId_controlId_unique" ("controlId", "controlReferenceId"),
	CONSTRAINT "FK__ControlCo__contr__753864A1" FOREIGN KEY ("controlId") REFERENCES "Controls" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE,
	CONSTRAINT "FK__ControlCo__contr__762C88DA" FOREIGN KEY ("controlReferenceId") REFERENCES "ControlReferences" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ControlCosos
CREATE TABLE IF NOT EXISTS "ControlCosos" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"coso_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"control_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__ControlCo__contr__7720AD13" ("control_id"),
	FOREIGN KEY INDEX "FK__ControlCo__coso___7814D14C" ("coso_id"),
	FOREIGN KEY INDEX "FK__ControlCo__coso___7908F585" ("coso_id"),
	CONSTRAINT "FK__ControlCo__coso___7814D14C" FOREIGN KEY ("coso_id") REFERENCES "CosoPoints" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__ControlCo__coso___7908F585" FOREIGN KEY ("coso_id") REFERENCES "CosoPoints" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__ControlCo__contr__7720AD13" FOREIGN KEY ("control_id") REFERENCES "Controls" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ControlDesignTests
CREATE TABLE IF NOT EXISTS "ControlDesignTests" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"procedure" NVARCHAR(4000) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"adequacy" NVARCHAR(4000) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"effectiveness" NVARCHAR(4000) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"status" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"control_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"risk_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"check_orm" INT NOT NULL DEFAULT '(0)',
	"comment" NVARCHAR(255) NULL DEFAULT 'NULL' COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"modifiedBy" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"year" INT NULL DEFAULT NULL,
	"quarter" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"preparerStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"preparerId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"checkerStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"checkerComment" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"checkerId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"reviewerStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"reviewerComment" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"reviewerId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"acceptanceStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"acceptanceComment" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"acceptanceId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"created_by" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	"preparerStart" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"maturity" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"function_id" CHAR(36) NULL DEFAULT 'NULL' COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	FOREIGN KEY INDEX "FK__ControlDe__modif__00AA174D" ("modifiedBy"),
	FOREIGN KEY INDEX "FK__ControlDe__prepa__019E3B86" ("preparerId"),
	FOREIGN KEY INDEX "FK__ControlDe__prepa__02925FBF" ("preparerId"),
	FOREIGN KEY INDEX "FK__ControlDe__revie__038683F8" ("reviewerId"),
	FOREIGN KEY INDEX "FK__ControlDe__revie__047AA831" ("reviewerId"),
	FOREIGN KEY INDEX "FK__ControlDe__risk___056ECC6A" ("risk_id"),
	FOREIGN KEY INDEX "FK_ControlDesignTests_Functions" ("function_id"),
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__ControlDe__accep__79FD19BE" ("acceptanceId"),
	FOREIGN KEY INDEX "FK__ControlDe__accep__7AF13DF7" ("acceptanceId"),
	FOREIGN KEY INDEX "FK__ControlDe__check__7BE56230" ("checkerId"),
	FOREIGN KEY INDEX "FK__ControlDe__check__7CD98669" ("checkerId"),
	FOREIGN KEY INDEX "FK__ControlDe__contr__7DCDAAA2" ("control_id"),
	FOREIGN KEY INDEX "FK__ControlDe__creat__7EC1CEDB" ("created_by"),
	FOREIGN KEY INDEX "FK__ControlDe__creat__7FB5F314" ("created_by"),
	CONSTRAINT "FK__ControlDe__contr__7DCDAAA2" FOREIGN KEY ("control_id") REFERENCES "Controls" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE,
	CONSTRAINT "FK__ControlDe__risk___056ECC6A" FOREIGN KEY ("risk_id") REFERENCES "Risks" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE,
	CONSTRAINT "FK__ControlDe__modif__00AA174D" FOREIGN KEY ("modifiedBy") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE SET_NULL,
	CONSTRAINT "FK__ControlDe__prepa__019E3B86" FOREIGN KEY ("preparerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__ControlDe__prepa__02925FBF" FOREIGN KEY ("preparerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__ControlDe__check__7BE56230" FOREIGN KEY ("checkerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__ControlDe__check__7CD98669" FOREIGN KEY ("checkerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__ControlDe__revie__038683F8" FOREIGN KEY ("reviewerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__ControlDe__revie__047AA831" FOREIGN KEY ("reviewerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__ControlDe__accep__79FD19BE" FOREIGN KEY ("acceptanceId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__ControlDe__accep__7AF13DF7" FOREIGN KEY ("acceptanceId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__ControlDe__creat__7EC1CEDB" FOREIGN KEY ("created_by") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__ControlDe__creat__7FB5F314" FOREIGN KEY ("created_by") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK_ControlDesignTests_Functions" FOREIGN KEY ("function_id") REFERENCES "Functions" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "CK__ControlDe__accep__5832119F" CHECK (([acceptanceStatus]=N'refused' OR [acceptanceStatus]=N'approved' OR [acceptanceStatus]=N'pending')),
	CONSTRAINT "CK__ControlDe__accep__592635D8" CHECK (([acceptanceStatus]=N'refused' OR [acceptanceStatus]=N'approved' OR [acceptanceStatus]=N'pending')),
	CONSTRAINT "CK__ControlDe__check__5A1A5A11" CHECK (([checkerStatus]=N'refused' OR [checkerStatus]=N'approved' OR [checkerStatus]=N'pending')),
	CONSTRAINT "CK__ControlDe__check__5B0E7E4A" CHECK (([checkerStatus]=N'refused' OR [checkerStatus]=N'approved' OR [checkerStatus]=N'pending')),
	CONSTRAINT "CK__ControlDe__prepa__5C02A283" CHECK (([preparerStatus]=N'sent' OR [preparerStatus]=N'draft')),
	CONSTRAINT "CK__ControlDe__prepa__5CF6C6BC" CHECK (([preparerStatus]=N'sent' OR [preparerStatus]=N'draft')),
	CONSTRAINT "CK__ControlDe__quart__5DEAEAF5" CHECK (([quarter]=N'quarterFour' OR [quarter]=N'quarterThree' OR [quarter]=N'quarterTwo' OR [quarter]=N'quarterOne')),
	CONSTRAINT "CK__ControlDe__quart__5EDF0F2E" CHECK (([quarter]=N'quarterFour' OR [quarter]=N'quarterThree' OR [quarter]=N'quarterTwo' OR [quarter]=N'quarterOne')),
	CONSTRAINT "CK__ControlDe__revie__5FD33367" CHECK (([reviewerStatus]=N'sent' OR [reviewerStatus]=N'pending')),
	CONSTRAINT "CK__ControlDe__revie__60C757A0" CHECK (([reviewerStatus]=N'sent' OR [reviewerStatus]=N'pending'))
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ControlDesignTests_BRANCH
CREATE TABLE IF NOT EXISTS "ControlDesignTests_BRANCH" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"procedure" NVARCHAR(4000) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"adequacy" NVARCHAR(4000) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"effectiveness" NVARCHAR(4000) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"status" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"control_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"risk_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"check_orm" INT NOT NULL,
	"comment" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"modifiedBy" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"year" INT NULL DEFAULT NULL,
	"quarter" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"preparerStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"preparerId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"checkerStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"checkerComment" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"checkerId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"reviewerStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"reviewerComment" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"reviewerId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"acceptanceStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"acceptanceComment" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"acceptanceId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"created_by" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	"preparerStart" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"maturity" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"function_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS'
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ControlDesignTests_BRANCH_test
CREATE TABLE IF NOT EXISTS "ControlDesignTests_BRANCH_test" (
	"control_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"risk_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"function_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS'
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ControlDesignTests_DEPT
CREATE TABLE IF NOT EXISTS "ControlDesignTests_DEPT" (
	"control_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"risk_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"function_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS'
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.controlDomains
CREATE TABLE IF NOT EXISTS "controlDomains" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"control_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"domain_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	FOREIGN KEY INDEX "FK__controlDo__contr__075714DC" ("control_id"),
	FOREIGN KEY INDEX "FK__controlDo__domai__084B3915" ("domain_id"),
	FOREIGN KEY INDEX "FK__controlDo__domai__093F5D4E" ("domain_id"),
	PRIMARY KEY ("id"),
	CONSTRAINT "FK__controlDo__contr__075714DC" FOREIGN KEY ("control_id") REFERENCES "Controls" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE,
	CONSTRAINT "FK__controlDo__domai__084B3915" FOREIGN KEY ("domain_id") REFERENCES "Domains" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__controlDo__domai__093F5D4E" FOREIGN KEY ("domain_id") REFERENCES "Domains" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ControlFunctions
CREATE TABLE IF NOT EXISTS "ControlFunctions" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"function_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"control_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	FOREIGN KEY INDEX "FK__ControlFu__contr__0A338187" ("control_id"),
	FOREIGN KEY INDEX "FK__ControlFu__contr__0B27A5C0" ("control_id"),
	FOREIGN KEY INDEX "FK__ControlFu__funct__0C1BC9F9" ("function_id"),
	PRIMARY KEY ("id"),
	CONSTRAINT "FK__ControlFu__funct__0C1BC9F9" FOREIGN KEY ("function_id") REFERENCES "Functions" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE,
	CONSTRAINT "FK__ControlFu__contr__0A338187" FOREIGN KEY ("control_id") REFERENCES "Controls" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__ControlFu__contr__0B27A5C0" FOREIGN KEY ("control_id") REFERENCES "Controls" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ControlIsos
CREATE TABLE IF NOT EXISTS "ControlIsos" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"iso_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"control_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	FOREIGN KEY INDEX "FK__ControlIs__contr__0D0FEE32" ("control_id"),
	FOREIGN KEY INDEX "FK__ControlIs__iso_i__0E04126B" ("iso_id"),
	FOREIGN KEY INDEX "FK__ControlIs__iso_i__0EF836A4" ("iso_id"),
	PRIMARY KEY ("id"),
	CONSTRAINT "FK__ControlIs__iso_i__0E04126B" FOREIGN KEY ("iso_id") REFERENCES "Isos" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__ControlIs__iso_i__0EF836A4" FOREIGN KEY ("iso_id") REFERENCES "Isos" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__ControlIs__contr__0D0FEE32" FOREIGN KEY ("control_id") REFERENCES "Controls" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ControlNists
CREATE TABLE IF NOT EXISTS "ControlNists" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"nist_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"control_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	FOREIGN KEY INDEX "FK__ControlNi__contr__0FEC5ADD" ("control_id"),
	FOREIGN KEY INDEX "FK__ControlNi__nist___10E07F16" ("nist_id"),
	FOREIGN KEY INDEX "FK__ControlNi__nist___11D4A34F" ("nist_id"),
	PRIMARY KEY ("id"),
	CONSTRAINT "FK__ControlNi__nist___10E07F16" FOREIGN KEY ("nist_id") REFERENCES "NistSubs" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__ControlNi__nist___11D4A34F" FOREIGN KEY ("nist_id") REFERENCES "NistSubs" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__ControlNi__contr__0FEC5ADD" FOREIGN KEY ("control_id") REFERENCES "Controls" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ControlProcesses
CREATE TABLE IF NOT EXISTS "ControlProcesses" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"control_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"process_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	FOREIGN KEY INDEX "FK__ControlPr__contr__12C8C788" ("control_id"),
	FOREIGN KEY INDEX "FK__ControlPr__proce__13BCEBC1" ("process_id"),
	PRIMARY KEY ("id"),
	CONSTRAINT "FK__ControlPr__contr__12C8C788" FOREIGN KEY ("control_id") REFERENCES "Controls" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE,
	CONSTRAINT "FK__ControlPr__proce__13BCEBC1" FOREIGN KEY ("process_id") REFERENCES "Processes" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ControlReferences
CREATE TABLE IF NOT EXISTS "ControlReferences" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"description" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"code" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"isDeleted" BIT NOT NULL DEFAULT '(0)',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	UNIQUE INDEX "UQ__ControlR__357D4CF96C417ADC" ("code")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.Controls
CREATE TABLE IF NOT EXISTS "Controls" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"description" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"objective" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"risk_response" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"departmentId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"head_departmentId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"preparerStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"preparerId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"checkerStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"checkerComment" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"checkerId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"reviewerStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"reviewerComment" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"reviewerId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"acceptanceStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"acceptanceComment" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"acceptanceId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"dependInfoId" BIT NULL DEFAULT NULL,
	"where_factor" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"frequency" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"timing" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"type" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"method" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"entityLevel" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"keyControl" BIT NULL DEFAULT NULL,
	"antiFraud" BIT NULL DEFAULT NULL,
	"systemId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"icof_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"test" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"created_by" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"code" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"isDeleted" BIT NOT NULL DEFAULT '(0)',
	"modifiedBy" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	"preparerStart" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name_indexable" NVARCHAR(450) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"description_copy" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	FOREIGN KEY INDEX "FK__Controls__accept__14B10FFA" ("acceptanceId"),
	FOREIGN KEY INDEX "FK__Controls__accept__15A53433" ("acceptanceId"),
	FOREIGN KEY INDEX "FK__Controls__checke__1699586C" ("checkerId"),
	FOREIGN KEY INDEX "FK__Controls__checke__178D7CA5" ("checkerId"),
	FOREIGN KEY INDEX "FK__Controls__create__1881A0DE" ("created_by"),
	FOREIGN KEY INDEX "FK__Controls__create__1975C517" ("created_by"),
	FOREIGN KEY INDEX "FK__Controls__depart__1A69E950" ("departmentId"),
	FOREIGN KEY INDEX "FK__Controls__depart__1B5E0D89" ("departmentId"),
	FOREIGN KEY INDEX "FK__Controls__head_d__1C5231C2" ("head_departmentId"),
	FOREIGN KEY INDEX "FK__Controls__head_d__1D4655FB" ("head_departmentId"),
	FOREIGN KEY INDEX "FK__Controls__icof_i__1E3A7A34" ("icof_id"),
	FOREIGN KEY INDEX "FK__Controls__icof_i__1F2E9E6D" ("icof_id"),
	FOREIGN KEY INDEX "FK__Controls__modifi__2022C2A6" ("modifiedBy"),
	FOREIGN KEY INDEX "FK__Controls__modifi__2116E6DF" ("modifiedBy"),
	FOREIGN KEY INDEX "FK__Controls__prepar__220B0B18" ("preparerId"),
	FOREIGN KEY INDEX "FK__Controls__prepar__22FF2F51" ("preparerId"),
	FOREIGN KEY INDEX "FK__Controls__review__23F3538A" ("reviewerId"),
	FOREIGN KEY INDEX "FK__Controls__review__24E777C3" ("reviewerId"),
	FOREIGN KEY INDEX "FK__Controls__system__25DB9BFC" ("systemId"),
	FOREIGN KEY INDEX "FK__Controls__system__26CFC035" ("systemId"),
	PRIMARY KEY ("id"),
	UNIQUE INDEX "UQ__Controls__357D4CF9E8744A35" ("code"),
	CONSTRAINT "FK__Controls__depart__1A69E950" FOREIGN KEY ("departmentId") REFERENCES "JobTitles" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Controls__depart__1B5E0D89" FOREIGN KEY ("departmentId") REFERENCES "JobTitles" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Controls__head_d__1C5231C2" FOREIGN KEY ("head_departmentId") REFERENCES "JobTitles" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Controls__head_d__1D4655FB" FOREIGN KEY ("head_departmentId") REFERENCES "JobTitles" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Controls__prepar__220B0B18" FOREIGN KEY ("preparerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Controls__prepar__22FF2F51" FOREIGN KEY ("preparerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Controls__checke__1699586C" FOREIGN KEY ("checkerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Controls__checke__178D7CA5" FOREIGN KEY ("checkerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Controls__review__23F3538A" FOREIGN KEY ("reviewerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Controls__review__24E777C3" FOREIGN KEY ("reviewerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Controls__accept__14B10FFA" FOREIGN KEY ("acceptanceId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Controls__accept__15A53433" FOREIGN KEY ("acceptanceId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Controls__system__25DB9BFC" FOREIGN KEY ("systemId") REFERENCES "Systems" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Controls__system__26CFC035" FOREIGN KEY ("systemId") REFERENCES "Systems" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Controls__icof_i__1E3A7A34" FOREIGN KEY ("icof_id") REFERENCES "Assertions" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Controls__icof_i__1F2E9E6D" FOREIGN KEY ("icof_id") REFERENCES "Assertions" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Controls__create__1881A0DE" FOREIGN KEY ("created_by") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Controls__create__1975C517" FOREIGN KEY ("created_by") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Controls__modifi__2022C2A6" FOREIGN KEY ("modifiedBy") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Controls__modifi__2116E6DF" FOREIGN KEY ("modifiedBy") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "CK__Controls__accept__61BB7BD9" CHECK (([acceptanceStatus]=N'refused' OR [acceptanceStatus]=N'approved' OR [acceptanceStatus]=N'pending')),
	CONSTRAINT "CK__Controls__accept__62AFA012" CHECK (([acceptanceStatus]=N'refused' OR [acceptanceStatus]=N'approved' OR [acceptanceStatus]=N'pending')),
	CONSTRAINT "CK__Controls__checke__63A3C44B" CHECK (([checkerStatus]=N'refused' OR [checkerStatus]=N'approved' OR [checkerStatus]=N'pending')),
	CONSTRAINT "CK__Controls__checke__6497E884" CHECK (([checkerStatus]=N'refused' OR [checkerStatus]=N'approved' OR [checkerStatus]=N'pending')),
	CONSTRAINT "CK__Controls__prepar__658C0CBD" CHECK (([preparerStatus]=N'sent' OR [preparerStatus]=N'draft')),
	CONSTRAINT "CK__Controls__prepar__668030F6" CHECK (([preparerStatus]=N'sent' OR [preparerStatus]=N'draft')),
	CONSTRAINT "CK__Controls__review__6774552F" CHECK (([reviewerStatus]=N'sent' OR [reviewerStatus]=N'pending')),
	CONSTRAINT "CK__Controls__review__68687968" CHECK (([reviewerStatus]=N'sent' OR [reviewerStatus]=N'pending'))
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.CosoComponents
CREATE TABLE IF NOT EXISTS "CosoComponents" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"number" INT NULL DEFAULT NULL,
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.CosoPoints
CREATE TABLE IF NOT EXISTS "CosoPoints" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"number" INT NULL DEFAULT NULL,
	"principle_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	FOREIGN KEY INDEX "FK__CosoPoint__princ__27C3E46E" ("principle_id"),
	PRIMARY KEY ("id"),
	CONSTRAINT "FK__CosoPoint__princ__27C3E46E" FOREIGN KEY ("principle_id") REFERENCES "CosoPrinciples" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.CosoPrinciples
CREATE TABLE IF NOT EXISTS "CosoPrinciples" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"number" INT NULL DEFAULT NULL,
	"component_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__CosoPrinc__compo__28B808A7" ("component_id"),
	CONSTRAINT "FK__CosoPrinc__compo__28B808A7" FOREIGN KEY ("component_id") REFERENCES "CosoComponents" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.Currencies
CREATE TABLE IF NOT EXISTS "Currencies" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"rate" FLOAT NULL DEFAULT NULL,
	"isDeleted" BIT NOT NULL DEFAULT '(0)',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.DiscoveredTypes
CREATE TABLE IF NOT EXISTS "DiscoveredTypes" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"description" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"isDeleted" BIT NOT NULL DEFAULT '(0)',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.Domains
CREATE TABLE IF NOT EXISTS "Domains" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"standard_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"code" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"en_name" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"ar_name" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"en_description" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"ar_description" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"parentId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__Domains__parentI__29AC2CE0" ("parentId"),
	FOREIGN KEY INDEX "FK__Domains__parentI__2AA05119" ("parentId"),
	FOREIGN KEY INDEX "FK__Domains__standar__2B947552" ("standard_id"),
	CONSTRAINT "FK__Domains__standar__2B947552" FOREIGN KEY ("standard_id") REFERENCES "ControlReferences" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE,
	CONSTRAINT "FK__Domains__parentI__29AC2CE0" FOREIGN KEY ("parentId") REFERENCES "Domains" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Domains__parentI__2AA05119" FOREIGN KEY ("parentId") REFERENCES "Domains" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.EffectiveFiles
CREATE TABLE IF NOT EXISTS "EffectiveFiles" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"test_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"src" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__Effective__test___2C88998B" ("test_id"),
	CONSTRAINT "FK__Effective__test___2C88998B" FOREIGN KEY ("test_id") REFERENCES "ControlDesignTests" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.EffectiveFindings
CREATE TABLE IF NOT EXISTS "EffectiveFindings" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"population" INT NULL DEFAULT NULL,
	"sample_size" INT NULL DEFAULT NULL,
	"controlDesignTest_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"finding" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"value" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"documentation" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__Effective__contr__2D7CBDC4" ("controlDesignTest_id"),
	CONSTRAINT "FK__Effective__contr__2D7CBDC4" FOREIGN KEY ("controlDesignTest_id") REFERENCES "ControlDesignTests" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.EventTypes
CREATE TABLE IF NOT EXISTS "EventTypes" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"description" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"code" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"isDeleted" BIT NOT NULL DEFAULT '(0)',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	UNIQUE INDEX "UQ__EventTyp__357D4CF92965E01E" ("code")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ExportedExcelReports
CREATE TABLE IF NOT EXISTS "ExportedExcelReports" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"filename" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"path" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"userId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.Fields
CREATE TABLE IF NOT EXISTS "Fields" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"field_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"required" BIT NULL DEFAULT NULL,
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__Fields__field_id__2E70E1FD" ("field_id"),
	FOREIGN KEY INDEX "FK__Fields__field_id__2F650636" ("field_id"),
	CONSTRAINT "FK__Fields__field_id__2E70E1FD" FOREIGN KEY ("field_id") REFERENCES "Pages" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Fields__field_id__2F650636" FOREIGN KEY ("field_id") REFERENCES "Pages" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.FileSupports
CREATE TABLE IF NOT EXISTS "FileSupports" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"isDeleted" BIT NOT NULL DEFAULT '(0)',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	"extension" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.FinancialImpacts
CREATE TABLE IF NOT EXISTS "FinancialImpacts" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"description" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"isDeleted" BIT NOT NULL DEFAULT '(0)',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.FinanicalFiles
CREATE TABLE IF NOT EXISTS "FinanicalFiles" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"risk_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"src" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__Finanical__risk___30592A6F" ("risk_id"),
	CONSTRAINT "FK__Finanical__risk___30592A6F" FOREIGN KEY ("risk_id") REFERENCES "Risks" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.FrequencyFiles
CREATE TABLE IF NOT EXISTS "FrequencyFiles" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"risk_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"src" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__Frequency__risk___314D4EA8" ("risk_id"),
	CONSTRAINT "FK__Frequency__risk___314D4EA8" FOREIGN KEY ("risk_id") REFERENCES "Risks" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.Functions
CREATE TABLE IF NOT EXISTS "Functions" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"description" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"code" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"isDeleted" BIT NOT NULL DEFAULT '(0)',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	UNIQUE INDEX "UQ__Function__357D4CF997A3D9CD" ("code")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.Groups
CREATE TABLE IF NOT EXISTS "Groups" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(255) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"permissions" NVARCHAR(max) NOT NULL DEFAULT 'N''[]''' COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ImpactedAreas
CREATE TABLE IF NOT EXISTS "ImpactedAreas" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"description" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ImpactFiles
CREATE TABLE IF NOT EXISTS "ImpactFiles" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"risk_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"impact_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"src" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__ImpactFil__impac__324172E1" ("impact_id"),
	FOREIGN KEY INDEX "FK__ImpactFil__risk___3335971A" ("risk_id"),
	FOREIGN KEY INDEX "FK__ImpactFil__risk___3429BB53" ("risk_id"),
	CONSTRAINT "FK__ImpactFil__risk___3335971A" FOREIGN KEY ("risk_id") REFERENCES "Risks" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__ImpactFil__risk___3429BB53" FOREIGN KEY ("risk_id") REFERENCES "Risks" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__ImpactFil__impac__324172E1" FOREIGN KEY ("impact_id") REFERENCES "RiskInherentImpacts" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.IncidentCategories
CREATE TABLE IF NOT EXISTS "IncidentCategories" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"description" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.IncidentEvents
CREATE TABLE IF NOT EXISTS "IncidentEvents" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"description" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"code" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"isDeleted" BIT NOT NULL DEFAULT '(0)',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	UNIQUE INDEX "UQ__Incident__357D4CF940DDD8DE" ("code")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.IncidentFiles
CREATE TABLE IF NOT EXISTS "IncidentFiles" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"incident_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"src" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__IncidentF__incid__351DDF8C" ("incident_id"),
	CONSTRAINT "FK__IncidentF__incid__351DDF8C" FOREIGN KEY ("incident_id") REFERENCES "Incidents" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.Incidents
CREATE TABLE IF NOT EXISTS "Incidents" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"title" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"description" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"rootCause" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"function_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"category_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"event_type_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"discovered_type_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"financial_impact_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"reported_date" DATETIMEOFFSET NULL DEFAULT NULL,
	"occurrence_date" DATETIMEOFFSET NULL DEFAULT NULL,
	"net_loss" FLOAT NULL DEFAULT NULL,
	"total_loss" FLOAT NULL DEFAULT NULL,
	"currency" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"recovery_amount" FLOAT NULL DEFAULT NULL,
	"exchange_rate" FLOAT NULL DEFAULT NULL,
	"kri" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"status" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"cause_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"modifiedBy" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"created_by" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"preparerStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"preparerId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"checkerStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"checkerComment" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"checkerId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"reviewerStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"reviewerComment" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"reviewerId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"acceptanceStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"acceptanceComment" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"acceptanceId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"code" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"isDeleted" BIT NOT NULL DEFAULT '(0)',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	"preparerStart" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"sub_category_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"timeFrame" INT NOT NULL DEFAULT '''(0)''',
	"importance" NVARCHAR(100) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__Incidents__accep__361203C5" ("acceptanceId"),
	FOREIGN KEY INDEX "FK__Incidents__accep__370627FE" ("acceptanceId"),
	FOREIGN KEY INDEX "FK__Incidents__categ__37FA4C37" ("category_id"),
	FOREIGN KEY INDEX "FK__Incidents__categ__38EE7070" ("category_id"),
	FOREIGN KEY INDEX "FK__Incidents__cause__39E294A9" ("cause_id"),
	FOREIGN KEY INDEX "FK__Incidents__cause__3AD6B8E2" ("cause_id"),
	FOREIGN KEY INDEX "FK__Incidents__check__3BCADD1B" ("checkerId"),
	FOREIGN KEY INDEX "FK__Incidents__check__3CBF0154" ("checkerId"),
	FOREIGN KEY INDEX "FK__Incidents__creat__3DB3258D" ("created_by"),
	FOREIGN KEY INDEX "FK__Incidents__creat__3EA749C6" ("created_by"),
	FOREIGN KEY INDEX "FK__Incidents__curre__3F9B6DFF" ("currency"),
	FOREIGN KEY INDEX "FK__Incidents__curre__408F9238" ("currency"),
	FOREIGN KEY INDEX "FK__Incidents__disco__4183B671" ("discovered_type_id"),
	FOREIGN KEY INDEX "FK__Incidents__disco__4277DAAA" ("discovered_type_id"),
	FOREIGN KEY INDEX "FK__Incidents__event__436BFEE3" ("event_type_id"),
	FOREIGN KEY INDEX "FK__Incidents__event__4460231C" ("event_type_id"),
	FOREIGN KEY INDEX "FK__Incidents__finan__45544755" ("financial_impact_id"),
	FOREIGN KEY INDEX "FK__Incidents__finan__46486B8E" ("financial_impact_id"),
	FOREIGN KEY INDEX "FK__Incidents__funct__473C8FC7" ("function_id"),
	FOREIGN KEY INDEX "FK__Incidents__funct__4830B400" ("function_id"),
	FOREIGN KEY INDEX "FK__Incidents__kri__4924D839" ("kri"),
	FOREIGN KEY INDEX "FK__Incidents__kri__4A18FC72" ("kri"),
	FOREIGN KEY INDEX "FK__Incidents__modif__4B0D20AB" ("modifiedBy"),
	FOREIGN KEY INDEX "FK__Incidents__prepa__4C0144E4" ("preparerId"),
	FOREIGN KEY INDEX "FK__Incidents__prepa__4CF5691D" ("preparerId"),
	FOREIGN KEY INDEX "FK__Incidents__revie__4DE98D56" ("reviewerId"),
	FOREIGN KEY INDEX "FK__Incidents__revie__4EDDB18F" ("reviewerId"),
	FOREIGN KEY INDEX "FK__Incidents__sub_c__4FD1D5C8" ("sub_category_id"),
	FOREIGN KEY INDEX "FK__Incidents__sub_c__50C5FA01" ("sub_category_id"),
	UNIQUE INDEX "UQ__Incident__357D4CF92120D5C0" ("code"),
	CONSTRAINT "FK__Incidents__funct__473C8FC7" FOREIGN KEY ("function_id") REFERENCES "Functions" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Incidents__funct__4830B400" FOREIGN KEY ("function_id") REFERENCES "Functions" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Incidents__categ__37FA4C37" FOREIGN KEY ("category_id") REFERENCES "Categories" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Incidents__categ__38EE7070" FOREIGN KEY ("category_id") REFERENCES "Categories" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Incidents__event__436BFEE3" FOREIGN KEY ("event_type_id") REFERENCES "IncidentEvents" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Incidents__event__4460231C" FOREIGN KEY ("event_type_id") REFERENCES "IncidentEvents" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Incidents__disco__4183B671" FOREIGN KEY ("discovered_type_id") REFERENCES "DiscoveredTypes" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Incidents__disco__4277DAAA" FOREIGN KEY ("discovered_type_id") REFERENCES "DiscoveredTypes" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Incidents__finan__45544755" FOREIGN KEY ("financial_impact_id") REFERENCES "FinancialImpacts" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Incidents__finan__46486B8E" FOREIGN KEY ("financial_impact_id") REFERENCES "FinancialImpacts" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Incidents__curre__3F9B6DFF" FOREIGN KEY ("currency") REFERENCES "Currencies" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Incidents__curre__408F9238" FOREIGN KEY ("currency") REFERENCES "Currencies" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Incidents__kri__4924D839" FOREIGN KEY ("kri") REFERENCES "Kris" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Incidents__kri__4A18FC72" FOREIGN KEY ("kri") REFERENCES "Kris" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Incidents__cause__39E294A9" FOREIGN KEY ("cause_id") REFERENCES "RootCauses" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Incidents__cause__3AD6B8E2" FOREIGN KEY ("cause_id") REFERENCES "RootCauses" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Incidents__modif__4B0D20AB" FOREIGN KEY ("modifiedBy") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE SET_NULL,
	CONSTRAINT "FK__Incidents__creat__3DB3258D" FOREIGN KEY ("created_by") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Incidents__creat__3EA749C6" FOREIGN KEY ("created_by") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Incidents__prepa__4C0144E4" FOREIGN KEY ("preparerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Incidents__prepa__4CF5691D" FOREIGN KEY ("preparerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Incidents__check__3BCADD1B" FOREIGN KEY ("checkerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Incidents__check__3CBF0154" FOREIGN KEY ("checkerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Incidents__revie__4DE98D56" FOREIGN KEY ("reviewerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Incidents__revie__4EDDB18F" FOREIGN KEY ("reviewerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Incidents__accep__361203C5" FOREIGN KEY ("acceptanceId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Incidents__accep__370627FE" FOREIGN KEY ("acceptanceId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Incidents__sub_c__4FD1D5C8" FOREIGN KEY ("sub_category_id") REFERENCES "IncidentSubCategories" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Incidents__sub_c__50C5FA01" FOREIGN KEY ("sub_category_id") REFERENCES "IncidentSubCategories" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "CK__Incidents__accep__695C9DA1" CHECK (([acceptanceStatus]=N'refused' OR [acceptanceStatus]=N'approved' OR [acceptanceStatus]=N'pending')),
	CONSTRAINT "CK__Incidents__accep__6A50C1DA" CHECK (([acceptanceStatus]=N'refused' OR [acceptanceStatus]=N'approved' OR [acceptanceStatus]=N'pending')),
	CONSTRAINT "CK__Incidents__check__6B44E613" CHECK (([checkerStatus]=N'refused' OR [checkerStatus]=N'approved' OR [checkerStatus]=N'pending')),
	CONSTRAINT "CK__Incidents__check__6C390A4C" CHECK (([checkerStatus]=N'refused' OR [checkerStatus]=N'approved' OR [checkerStatus]=N'pending')),
	CONSTRAINT "CK__Incidents__prepa__6D2D2E85" CHECK (([preparerStatus]=N'sent' OR [preparerStatus]=N'draft')),
	CONSTRAINT "CK__Incidents__prepa__6E2152BE" CHECK (([preparerStatus]=N'sent' OR [preparerStatus]=N'draft')),
	CONSTRAINT "CK__Incidents__revie__6F1576F7" CHECK (([reviewerStatus]=N'sent' OR [reviewerStatus]=N'pending')),
	CONSTRAINT "CK__Incidents__revie__70099B30" CHECK (([reviewerStatus]=N'sent' OR [reviewerStatus]=N'pending'))
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.IncidentSubCategories
CREATE TABLE IF NOT EXISTS "IncidentSubCategories" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"description" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	"isDeleted" BIT NOT NULL,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.Isos
CREATE TABLE IF NOT EXISTS "Isos" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"code" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.JobTitles
CREATE TABLE IF NOT EXISTS "JobTitles" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"description" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"code" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"isDeleted" BIT NOT NULL DEFAULT '(0)',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	UNIQUE INDEX "UQ__JobTitle__357D4CF997FBD9B8" ("code"),
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.KriFunctions
CREATE TABLE IF NOT EXISTS "KriFunctions" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"function_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"kri_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__KriFuncti__funct__51BA1E3A" ("function_id"),
	FOREIGN KEY INDEX "FK__KriFuncti__funct__52AE4273" ("function_id"),
	FOREIGN KEY INDEX "FK__KriFuncti__kri_i__53A266AC" ("kri_id"),
	CONSTRAINT "FK__KriFuncti__funct__51BA1E3A" FOREIGN KEY ("function_id") REFERENCES "Functions" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__KriFuncti__funct__52AE4273" FOREIGN KEY ("function_id") REFERENCES "Functions" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__KriFuncti__kri_i__53A266AC" FOREIGN KEY ("kri_id") REFERENCES "Kris" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.KriProcesses
CREATE TABLE IF NOT EXISTS "KriProcesses" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"kri_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"process_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__KriProces__kri_i__54968AE5" ("kri_id"),
	FOREIGN KEY INDEX "FK__KriProces__kri_i__558AAF1E" ("kri_id"),
	FOREIGN KEY INDEX "FK__KriProces__proce__567ED357" ("process_id"),
	FOREIGN KEY INDEX "FK__KriProces__proce__5772F790" ("process_id"),
	CONSTRAINT "FK__KriProces__kri_i__54968AE5" FOREIGN KEY ("kri_id") REFERENCES "Kris" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__KriProces__kri_i__558AAF1E" FOREIGN KEY ("kri_id") REFERENCES "Kris" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__KriProces__proce__567ED357" FOREIGN KEY ("process_id") REFERENCES "Processes" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__KriProces__proce__5772F790" FOREIGN KEY ("process_id") REFERENCES "Processes" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.KriRisks
CREATE TABLE IF NOT EXISTS "KriRisks" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"risk_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"kri_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__KriRisks__kri_id__58671BC9" ("kri_id"),
	FOREIGN KEY INDEX "FK__KriRisks__risk_i__595B4002" ("risk_id"),
	CONSTRAINT "FK__KriRisks__risk_i__595B4002" FOREIGN KEY ("risk_id") REFERENCES "Risks" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE,
	CONSTRAINT "FK__KriRisks__kri_id__58671BC9" FOREIGN KEY ("kri_id") REFERENCES "Kris" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.Kris
CREATE TABLE IF NOT EXISTS "Kris" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"kriName" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"assignedPersonId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"preparerId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"preparerStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"checkerId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"checkerStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"checkerComment" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"reviewerId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"reviewerStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"reviewerComment" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"acceptanceId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"acceptanceStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"acceptanceComment" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"addedBy" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"modifiedBy" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"kri_level" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"typePercentageOrFigure" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"status" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"frequency" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"threshold" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"low_from" FLOAT NULL DEFAULT NULL,
	"medium_from" FLOAT NULL DEFAULT NULL,
	"high_from" FLOAT NULL DEFAULT NULL,
	"code" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"isAscending" BIT NOT NULL DEFAULT '(1)',
	"created_by" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"isDeleted" BIT NOT NULL DEFAULT '(0)',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	"preparerStart" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"related_function_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"type" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	UNIQUE INDEX "UQ__Kris__357D4CF9C01F85CB" ("code"),
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__Kris__acceptance__5A4F643B" ("acceptanceId"),
	FOREIGN KEY INDEX "FK__Kris__acceptance__5B438874" ("acceptanceId"),
	FOREIGN KEY INDEX "FK__Kris__addedBy__5C37ACAD" ("addedBy"),
	FOREIGN KEY INDEX "FK__Kris__addedBy__5D2BD0E6" ("addedBy"),
	FOREIGN KEY INDEX "FK__Kris__assignedPe__5E1FF51F" ("assignedPersonId"),
	FOREIGN KEY INDEX "FK__Kris__assignedPe__5F141958" ("assignedPersonId"),
	FOREIGN KEY INDEX "FK__Kris__checkerId__60083D91" ("checkerId"),
	FOREIGN KEY INDEX "FK__Kris__checkerId__60FC61CA" ("checkerId"),
	FOREIGN KEY INDEX "FK__Kris__created_by__61F08603" ("created_by"),
	FOREIGN KEY INDEX "FK__Kris__created_by__62E4AA3C" ("created_by"),
	FOREIGN KEY INDEX "FK__Kris__modifiedBy__63D8CE75" ("modifiedBy"),
	FOREIGN KEY INDEX "FK__Kris__modifiedBy__64CCF2AE" ("modifiedBy"),
	FOREIGN KEY INDEX "FK__Kris__preparerId__65C116E7" ("preparerId"),
	FOREIGN KEY INDEX "FK__Kris__preparerId__66B53B20" ("preparerId"),
	FOREIGN KEY INDEX "FK__Kris__related_fu__67A95F59" ("related_function_id"),
	FOREIGN KEY INDEX "FK__Kris__related_fu__689D8392" ("related_function_id"),
	FOREIGN KEY INDEX "FK__Kris__reviewerId__6991A7CB" ("reviewerId"),
	FOREIGN KEY INDEX "FK__Kris__reviewerId__6A85CC04" ("reviewerId"),
	CONSTRAINT "FK__Kris__assignedPe__5E1FF51F" FOREIGN KEY ("assignedPersonId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Kris__assignedPe__5F141958" FOREIGN KEY ("assignedPersonId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Kris__preparerId__65C116E7" FOREIGN KEY ("preparerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Kris__preparerId__66B53B20" FOREIGN KEY ("preparerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Kris__checkerId__60083D91" FOREIGN KEY ("checkerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Kris__checkerId__60FC61CA" FOREIGN KEY ("checkerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Kris__reviewerId__6991A7CB" FOREIGN KEY ("reviewerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Kris__reviewerId__6A85CC04" FOREIGN KEY ("reviewerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Kris__acceptance__5A4F643B" FOREIGN KEY ("acceptanceId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Kris__acceptance__5B438874" FOREIGN KEY ("acceptanceId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Kris__addedBy__5C37ACAD" FOREIGN KEY ("addedBy") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Kris__addedBy__5D2BD0E6" FOREIGN KEY ("addedBy") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Kris__modifiedBy__63D8CE75" FOREIGN KEY ("modifiedBy") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Kris__modifiedBy__64CCF2AE" FOREIGN KEY ("modifiedBy") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Kris__created_by__61F08603" FOREIGN KEY ("created_by") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Kris__created_by__62E4AA3C" FOREIGN KEY ("created_by") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Kris__related_fu__67A95F59" FOREIGN KEY ("related_function_id") REFERENCES "Functions" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Kris__related_fu__689D8392" FOREIGN KEY ("related_function_id") REFERENCES "Functions" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "CK__Kris__acceptance__70FDBF69" CHECK (([acceptanceStatus]=N'refused' OR [acceptanceStatus]=N'approved' OR [acceptanceStatus]=N'pending')),
	CONSTRAINT "CK__Kris__acceptance__71F1E3A2" CHECK (([acceptanceStatus]=N'refused' OR [acceptanceStatus]=N'approved' OR [acceptanceStatus]=N'pending')),
	CONSTRAINT "CK__Kris__checkerSta__72E607DB" CHECK (([checkerStatus]=N'refused' OR [checkerStatus]=N'approved' OR [checkerStatus]=N'pending')),
	CONSTRAINT "CK__Kris__checkerSta__73DA2C14" CHECK (([checkerStatus]=N'refused' OR [checkerStatus]=N'approved' OR [checkerStatus]=N'pending')),
	CONSTRAINT "CK__Kris__preparerSt__74CE504D" CHECK (([preparerStatus]=N'sent' OR [preparerStatus]=N'draft')),
	CONSTRAINT "CK__Kris__preparerSt__75C27486" CHECK (([preparerStatus]=N'sent' OR [preparerStatus]=N'draft')),
	CONSTRAINT "CK__Kris__reviewerSt__76B698BF" CHECK (([reviewerStatus]=N'sent' OR [reviewerStatus]=N'pending')),
	CONSTRAINT "CK__Kris__reviewerSt__77AABCF8" CHECK (([reviewerStatus]=N'sent' OR [reviewerStatus]=N'pending'))
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.KriUsers
CREATE TABLE IF NOT EXISTS "KriUsers" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"user_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"kri_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__KriUsers__kri_id__6B79F03D" ("kri_id"),
	FOREIGN KEY INDEX "FK__KriUsers__kri_id__6C6E1476" ("kri_id"),
	FOREIGN KEY INDEX "FK__KriUsers__user_i__6D6238AF" ("user_id"),
	FOREIGN KEY INDEX "FK__KriUsers__user_i__6E565CE8" ("user_id"),
	CONSTRAINT "FK__KriUsers__user_i__6D6238AF" FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__KriUsers__user_i__6E565CE8" FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__KriUsers__kri_id__6B79F03D" FOREIGN KEY ("kri_id") REFERENCES "Kris" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__KriUsers__kri_id__6C6E1476" FOREIGN KEY ("kri_id") REFERENCES "Kris" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.KriValues
CREATE TABLE IF NOT EXISTS "KriValues" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"kriId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"year" INT NULL DEFAULT NULL,
	"month" INT NULL DEFAULT NULL,
	"value" FLOAT NULL DEFAULT NULL,
	"preparerId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"preparerStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"checkerId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"checkerStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"checkerComment" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"modifiedBy" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"created_by" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	"assessment" NVARCHAR(6) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__KriValues__check__6F4A8121" ("checkerId"),
	FOREIGN KEY INDEX "FK__KriValues__check__703EA55A" ("checkerId"),
	FOREIGN KEY INDEX "FK__KriValues__creat__7132C993" ("created_by"),
	FOREIGN KEY INDEX "FK__KriValues__creat__7226EDCC" ("created_by"),
	FOREIGN KEY INDEX "FK__KriValues__kriId__731B1205" ("kriId"),
	FOREIGN KEY INDEX "FK__KriValues__modif__740F363E" ("modifiedBy"),
	FOREIGN KEY INDEX "FK__KriValues__modif__75035A77" ("modifiedBy"),
	FOREIGN KEY INDEX "FK__KriValues__prepa__75F77EB0" ("preparerId"),
	FOREIGN KEY INDEX "FK__KriValues__prepa__76EBA2E9" ("preparerId"),
	CONSTRAINT "FK__KriValues__kriId__731B1205" FOREIGN KEY ("kriId") REFERENCES "Kris" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE,
	CONSTRAINT "FK__KriValues__prepa__75F77EB0" FOREIGN KEY ("preparerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__KriValues__prepa__76EBA2E9" FOREIGN KEY ("preparerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__KriValues__check__6F4A8121" FOREIGN KEY ("checkerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__KriValues__check__703EA55A" FOREIGN KEY ("checkerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__KriValues__modif__740F363E" FOREIGN KEY ("modifiedBy") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__KriValues__modif__75035A77" FOREIGN KEY ("modifiedBy") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__KriValues__creat__7132C993" FOREIGN KEY ("created_by") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__KriValues__creat__7226EDCC" FOREIGN KEY ("created_by") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "CK__KriValues__check__789EE131" CHECK (([checkerStatus]=N'refused' OR [checkerStatus]=N'approved' OR [checkerStatus]=N'pending')),
	CONSTRAINT "CK__KriValues__check__7993056A" CHECK (([checkerStatus]=N'refused' OR [checkerStatus]=N'approved' OR [checkerStatus]=N'pending')),
	CONSTRAINT "CK__KriValues__prepa__7A8729A3" CHECK (([preparerStatus]=N'sent' OR [preparerStatus]=N'draft')),
	CONSTRAINT "CK__KriValues__prepa__7B7B4DDC" CHECK (([preparerStatus]=N'sent' OR [preparerStatus]=N'draft'))
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.NistCats
CREATE TABLE IF NOT EXISTS "NistCats" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.NistSubs
CREATE TABLE IF NOT EXISTS "NistSubs" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"number" INT NULL DEFAULT NULL,
	"cat_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__NistSubs__cat_id__77DFC722" ("cat_id"),
	CONSTRAINT "FK__NistSubs__cat_id__77DFC722" FOREIGN KEY ("cat_id") REFERENCES "NistCats" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.Notifications
CREATE TABLE IF NOT EXISTS "Notifications" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"message" NVARCHAR(255) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"fromId" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"toId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"type" NVARCHAR(255) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"actionId" NVARCHAR(255) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"seen" BIT NOT NULL DEFAULT '(0)',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	"done" BIT NOT NULL DEFAULT '(0)',
	"doneAT" DATETIMEOFFSET NULL DEFAULT NULL,
	"doneBy" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__Notificat__doneB__78D3EB5B" ("doneBy"),
	FOREIGN KEY INDEX "FK__Notificat__doneB__79C80F94" ("doneBy"),
	FOREIGN KEY INDEX "FK__Notificat__fromI__7ABC33CD" ("fromId"),
	FOREIGN KEY INDEX "FK__Notificat__fromI__7BB05806" ("fromId"),
	FOREIGN KEY INDEX "FK__Notificati__toId__7CA47C3F" ("toId"),
	FOREIGN KEY INDEX "FK__Notificati__toId__7D98A078" ("toId"),
	CONSTRAINT "FK__Notificat__fromI__7ABC33CD" FOREIGN KEY ("fromId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Notificat__fromI__7BB05806" FOREIGN KEY ("fromId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Notificati__toId__7CA47C3F" FOREIGN KEY ("toId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Notificati__toId__7D98A078" FOREIGN KEY ("toId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Notificat__doneB__78D3EB5B" FOREIGN KEY ("doneBy") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Notificat__doneB__79C80F94" FOREIGN KEY ("doneBy") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.Pages
CREATE TABLE IF NOT EXISTS "Pages" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.Processes
CREATE TABLE IF NOT EXISTS "Processes" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(4000) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"description" NVARCHAR(4000) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"code" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"isDeleted" BIT NOT NULL DEFAULT '(0)',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	UNIQUE INDEX "UQ__Processe__357D4CF96DC0F4CA" ("code"),
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.PublicSurveys
CREATE TABLE IF NOT EXISTS "PublicSurveys" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name_en" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name_ar" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"description_en" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"description_ar" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"code" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	"approval_status" NVARCHAR(255) NULL DEFAULT 'N''draft''' COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"approved_by" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"sent_by" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdBy" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	FOREIGN KEY INDEX "fk_public_surveys_approved_by" ("approved_by"),
	PRIMARY KEY ("id"),
	CONSTRAINT "fk_public_surveys_approved_by" FOREIGN KEY ("approved_by") REFERENCES "Users" ("id") ON UPDATE CASCADE ON DELETE SET_NULL
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.PublicSurveyUsers
CREATE TABLE IF NOT EXISTS "PublicSurveyUsers" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"publicSurveyId" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"userId" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	FOREIGN KEY INDEX "FK__PublicSur__userI__00750D23" ("userId"),
	PRIMARY KEY ("id"),
	FOREIGN KEY INDEX "FK__PublicSur__publi__7E8CC4B1" ("publicSurveyId"),
	FOREIGN KEY INDEX "FK__PublicSur__userI__7F80E8EA" ("userId"),
	CONSTRAINT "FK__PublicSur__publi__7E8CC4B1" FOREIGN KEY ("publicSurveyId") REFERENCES "PublicSurveys" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE,
	CONSTRAINT "FK__PublicSur__userI__00750D23" FOREIGN KEY ("userId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__PublicSur__userI__7F80E8EA" FOREIGN KEY ("userId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.rcm-V2 - RCM 
CREATE TABLE IF NOT EXISTS "rcm-V2 - RCM " (
	"Function" NVARCHAR(50) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Account_Name" NVARCHAR(100) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Account_Type" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Process" NTEXT NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Sub_Process" NTEXT NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Objective" NTEXT NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Risk_Code" NTEXT NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Risk" TEXT NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Risk_Event_and_Consequence_Impact" NVARCHAR(50) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Credit_Risk" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Information_Risk" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Reputation_Risk" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Market_Risk" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Strategic_Risk" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Operational_Risk" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Inherent_Frequency" NVARCHAR(50) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Inherent_Frequency1" NVARCHAR(50) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Financial" NVARCHAR(50) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"FI" TINYINT NULL DEFAULT NULL,
	"Regulatory" TINYINT NOT NULL,
	"Reputational" TINYINT NOT NULL,
	"Staff" TINYINT NOT NULL,
	"Customers" TINYINT NOT NULL,
	"Max_Impact" TINYINT NULL DEFAULT NULL,
	"Inherent_Risk" NVARCHAR(50) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Inherent_Risk2" NVARCHAR(50) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Control" NVARCHAR(50) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Control_Description" NVARCHAR(max) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Control_Objective" NTEXT NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Entity" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Control_method_Auto_Manual_ITDM" NVARCHAR(50) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"System_Name_Dependency_ies" NVARCHAR(100) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Control_Type_Preventive_Detective_Corrective" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Control_Frequency" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Control_Owner_s" NTEXT NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Anti_Fraud_Control_Yes_No" NTEXT NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Control_Classification_Key_Non_Key" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Depending_on_Information_Produced_by_the_Entity_IPE_Y_N" BIT NULL DEFAULT NULL,
	"Existence_Occurrence" BIT NULL DEFAULT NULL,
	"Completeness" BIT NULL DEFAULT NULL,
	"Accuracy" BIT NULL DEFAULT NULL,
	"Valuation_Allocation" BIT NULL DEFAULT NULL,
	"Rights_and_Obligations" BIT NULL DEFAULT NULL,
	"Presentation_and_Disclosure" BIT NULL DEFAULT NULL,
	"COSO_Component" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"COSO_Principle" NVARCHAR(100) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"COSO_Focus_Point" NVARCHAR(150) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Population" MONEY(19,4) NULL DEFAULT NULL,
	"Sample" TINYINT NULL DEFAULT NULL,
	"Work_Done_Test_of_Design_Procedures" NTEXT NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Test_Results_Control_Design_Adequate_Not_Adequate" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Evidence" NVARCHAR(400) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Residual_Frequency" NVARCHAR(50) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Residual_Frequency1" TINYINT NOT NULL,
	"Financial2" NVARCHAR(50) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"FI2" TINYINT NULL DEFAULT NULL,
	"Regulatory2" TINYINT NOT NULL,
	"Reputational2" TINYINT NOT NULL,
	"Staff2" TINYINT NOT NULL,
	"Customers2" TINYINT NULL DEFAULT NULL,
	"Max_Impact2" TINYINT NULL DEFAULT NULL,
	"Residual_Risk" TINYINT NULL DEFAULT NULL,
	"Residual_Risk2" NVARCHAR(50) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Gap_Description_exception_finding" NTEXT NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Recommendation_s_corrective_action_plan" NTEXT NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Target_date_for_clousure" NTEXT NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Gap_status" NTEXT NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS'
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.RcmFiles
CREATE TABLE IF NOT EXISTS "RcmFiles" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"rcm_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"src" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	FOREIGN KEY INDEX "FK__RcmFiles__rcm_id__0169315C" ("rcm_id"),
	PRIMARY KEY ("id"),
	CONSTRAINT "FK__RcmFiles__rcm_id__0169315C" FOREIGN KEY ("rcm_id") REFERENCES "ControlDesignTests" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ResidualFiles
CREATE TABLE IF NOT EXISTS "ResidualFiles" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"risk_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"residual_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"src" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	FOREIGN KEY INDEX "FK__ResidualF__resid__025D5595" ("residual_id"),
	FOREIGN KEY INDEX "FK__ResidualF__risk___035179CE" ("risk_id"),
	FOREIGN KEY INDEX "FK__ResidualF__risk___04459E07" ("risk_id"),
	PRIMARY KEY ("id"),
	CONSTRAINT "FK__ResidualF__risk___035179CE" FOREIGN KEY ("risk_id") REFERENCES "Risks" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__ResidualF__risk___04459E07" FOREIGN KEY ("risk_id") REFERENCES "Risks" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__ResidualF__resid__025D5595" FOREIGN KEY ("residual_id") REFERENCES "RiskResidualAssessments" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ResidualFinanicalFiles
CREATE TABLE IF NOT EXISTS "ResidualFinanicalFiles" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"risk_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"src" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	"residual_risk_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	FOREIGN KEY INDEX "FK__ResidualF__resid__0539C240" ("residual_risk_id"),
	FOREIGN KEY INDEX "FK__ResidualF__resid__062DE679" ("residual_risk_id"),
	FOREIGN KEY INDEX "FK__ResidualF__risk___07220AB2" ("risk_id"),
	PRIMARY KEY ("id"),
	CONSTRAINT "FK__ResidualF__risk___07220AB2" FOREIGN KEY ("risk_id") REFERENCES "Risks" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE,
	CONSTRAINT "FK__ResidualF__resid__0539C240" FOREIGN KEY ("residual_risk_id") REFERENCES "Residualrisks" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__ResidualF__resid__062DE679" FOREIGN KEY ("residual_risk_id") REFERENCES "Residualrisks" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.ResidualFrequencyFiles
CREATE TABLE IF NOT EXISTS "ResidualFrequencyFiles" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"risk_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"src" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	"residual_risk_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	FOREIGN KEY INDEX "FK__ResidualF__resid__08162EEB" ("residual_risk_id"),
	FOREIGN KEY INDEX "FK__ResidualF__resid__090A5324" ("residual_risk_id"),
	FOREIGN KEY INDEX "FK__ResidualF__risk___09FE775D" ("risk_id"),
	PRIMARY KEY ("id"),
	CONSTRAINT "FK__ResidualF__risk___09FE775D" FOREIGN KEY ("risk_id") REFERENCES "Risks" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE,
	CONSTRAINT "FK__ResidualF__resid__08162EEB" FOREIGN KEY ("residual_risk_id") REFERENCES "Residualrisks" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__ResidualF__resid__090A5324" FOREIGN KEY ("residual_risk_id") REFERENCES "Residualrisks" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.Residualrisks
CREATE TABLE IF NOT EXISTS "Residualrisks" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"riskId" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"residual_frequency" INT NULL DEFAULT NULL,
	"residual_value" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"residual_financial_value" INT NULL DEFAULT NULL,
	"preparerResidualStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"preparerResidualId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"preparerResidualStart" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"checkerResidualStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"checkerResidualComment" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"checkerResidualId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"reviewerResidualStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"reviewerResidualComment" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"reviewerResidualId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"acceptanceResidualStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"acceptanceResidualComment" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"acceptanceResidualId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"isDeleted" BIT NOT NULL DEFAULT '(0)',
	"modifiedBy" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"created_by" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"quarter" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"year" INT NULL DEFAULT NULL,
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	FOREIGN KEY INDEX "FK__Residualr__accep__0AF29B96" ("acceptanceResidualId"),
	FOREIGN KEY INDEX "FK__Residualr__accep__0BE6BFCF" ("acceptanceResidualId"),
	FOREIGN KEY INDEX "FK__Residualr__check__0CDAE408" ("checkerResidualId"),
	FOREIGN KEY INDEX "FK__Residualr__check__0DCF0841" ("checkerResidualId"),
	FOREIGN KEY INDEX "FK__Residualr__creat__0EC32C7A" ("created_by"),
	FOREIGN KEY INDEX "FK__Residualr__creat__0FB750B3" ("created_by"),
	FOREIGN KEY INDEX "FK__Residualr__modif__10AB74EC" ("modifiedBy"),
	FOREIGN KEY INDEX "FK__Residualr__modif__119F9925" ("modifiedBy"),
	FOREIGN KEY INDEX "FK__Residualr__prepa__1293BD5E" ("preparerResidualId"),
	FOREIGN KEY INDEX "FK__Residualr__prepa__1387E197" ("preparerResidualId"),
	FOREIGN KEY INDEX "FK__Residualr__revie__147C05D0" ("reviewerResidualId"),
	FOREIGN KEY INDEX "FK__Residualr__revie__15702A09" ("reviewerResidualId"),
	FOREIGN KEY INDEX "FK__Residualr__riskI__16644E42" ("riskId"),
	FOREIGN KEY INDEX "FK__Residualr__riskI__1758727B" ("riskId"),
	PRIMARY KEY ("id"),
	CONSTRAINT "FK__Residualr__riskI__16644E42" FOREIGN KEY ("riskId") REFERENCES "Risks" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Residualr__riskI__1758727B" FOREIGN KEY ("riskId") REFERENCES "Risks" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Residualr__prepa__1293BD5E" FOREIGN KEY ("preparerResidualId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Residualr__prepa__1387E197" FOREIGN KEY ("preparerResidualId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Residualr__check__0CDAE408" FOREIGN KEY ("checkerResidualId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Residualr__check__0DCF0841" FOREIGN KEY ("checkerResidualId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Residualr__revie__147C05D0" FOREIGN KEY ("reviewerResidualId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Residualr__revie__15702A09" FOREIGN KEY ("reviewerResidualId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Residualr__accep__0AF29B96" FOREIGN KEY ("acceptanceResidualId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Residualr__accep__0BE6BFCF" FOREIGN KEY ("acceptanceResidualId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Residualr__modif__10AB74EC" FOREIGN KEY ("modifiedBy") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Residualr__modif__119F9925" FOREIGN KEY ("modifiedBy") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Residualr__creat__0EC32C7A" FOREIGN KEY ("created_by") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Residualr__creat__0FB750B3" FOREIGN KEY ("created_by") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "CK__Residualr__prepa__004002F9" CHECK (([preparerResidualStatus]=N'sent' OR [preparerResidualStatus]=N'draft')),
	CONSTRAINT "CK__Residualr__prepa__01342732" CHECK (([preparerResidualStatus]=N'sent' OR [preparerResidualStatus]=N'draft')),
	CONSTRAINT "CK__Residualr__revie__02284B6B" CHECK (([reviewerResidualStatus]=N'sent' OR [reviewerResidualStatus]=N'pending')),
	CONSTRAINT "CK__Residualr__revie__031C6FA4" CHECK (([reviewerResidualStatus]=N'sent' OR [reviewerResidualStatus]=N'pending')),
	CONSTRAINT "CK__Residualr__accep__7C6F7215" CHECK (([acceptanceResidualStatus]=N'refused' OR [acceptanceResidualStatus]=N'approved' OR [acceptanceResidualStatus]=N'pending')),
	CONSTRAINT "CK__Residualr__accep__7D63964E" CHECK (([acceptanceResidualStatus]=N'refused' OR [acceptanceResidualStatus]=N'approved' OR [acceptanceResidualStatus]=N'pending')),
	CONSTRAINT "CK__Residualr__check__7E57BA87" CHECK (([checkerResidualStatus]=N'refused' OR [checkerResidualStatus]=N'approved' OR [checkerResidualStatus]=N'pending')),
	CONSTRAINT "CK__Residualr__check__7F4BDEC0" CHECK (([checkerResidualStatus]=N'refused' OR [checkerResidualStatus]=N'approved' OR [checkerResidualStatus]=N'pending'))
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.RiskCategories
CREATE TABLE IF NOT EXISTS "RiskCategories" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"category_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"risk_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"isDeleted" BIT NOT NULL DEFAULT '(0)',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	FOREIGN KEY INDEX "FK__RiskCateg__categ__184C96B4" ("category_id"),
	FOREIGN KEY INDEX "FK__RiskCateg__categ__1940BAED" ("category_id"),
	FOREIGN KEY INDEX "FK__RiskCateg__risk___1A34DF26" ("risk_id"),
	PRIMARY KEY ("id"),
	CONSTRAINT "FK__RiskCateg__categ__184C96B4" FOREIGN KEY ("category_id") REFERENCES "Categories" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__RiskCateg__categ__1940BAED" FOREIGN KEY ("category_id") REFERENCES "Categories" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__RiskCateg__risk___1A34DF26" FOREIGN KEY ("risk_id") REFERENCES "Risks" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.RiskControls
CREATE TABLE IF NOT EXISTS "RiskControls" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"risk_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"control_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	FOREIGN KEY INDEX "FK__RiskContr__contr__1B29035F" ("control_id"),
	FOREIGN KEY INDEX "FK__RiskContr__contr__1C1D2798" ("control_id"),
	FOREIGN KEY INDEX "FK__RiskContr__risk___1D114BD1" ("risk_id"),
	PRIMARY KEY ("id"),
	CONSTRAINT "FK__RiskContr__risk___1D114BD1" FOREIGN KEY ("risk_id") REFERENCES "Risks" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE,
	CONSTRAINT "FK__RiskContr__contr__1B29035F" FOREIGN KEY ("control_id") REFERENCES "Controls" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__RiskContr__contr__1C1D2798" FOREIGN KEY ("control_id") REFERENCES "Controls" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.RiskFunctions
CREATE TABLE IF NOT EXISTS "RiskFunctions" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"function_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"risk_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	FOREIGN KEY INDEX "FK__RiskFunct__funct__1E05700A" ("function_id"),
	FOREIGN KEY INDEX "FK__RiskFunct__funct__1EF99443" ("function_id"),
	FOREIGN KEY INDEX "FK__RiskFunct__risk___1FEDB87C" ("risk_id"),
	PRIMARY KEY ("id"),
	CONSTRAINT "FK__RiskFunct__funct__1E05700A" FOREIGN KEY ("function_id") REFERENCES "Functions" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__RiskFunct__funct__1EF99443" FOREIGN KEY ("function_id") REFERENCES "Functions" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__RiskFunct__risk___1FEDB87C" FOREIGN KEY ("risk_id") REFERENCES "Risks" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.RiskIncidents
CREATE TABLE IF NOT EXISTS "RiskIncidents" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"risk_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"incident_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	FOREIGN KEY INDEX "FK__RiskIncid__incid__20E1DCB5" ("incident_id"),
	FOREIGN KEY INDEX "FK__RiskIncid__incid__21D600EE" ("incident_id"),
	FOREIGN KEY INDEX "FK__RiskIncid__risk___22CA2527" ("risk_id"),
	PRIMARY KEY ("id"),
	CONSTRAINT "FK__RiskIncid__risk___22CA2527" FOREIGN KEY ("risk_id") REFERENCES "Risks" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE,
	CONSTRAINT "FK__RiskIncid__incid__20E1DCB5" FOREIGN KEY ("incident_id") REFERENCES "Incidents" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__RiskIncid__incid__21D600EE" FOREIGN KEY ("incident_id") REFERENCES "Incidents" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.RiskInherentImpacts
CREATE TABLE IF NOT EXISTS "RiskInherentImpacts" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"title" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"risk_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"percentage" INT NULL DEFAULT NULL,
	"value" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"modifiedBy" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	FOREIGN KEY INDEX "FK__RiskInher__risk___23BE4960" ("risk_id"),
	PRIMARY KEY ("id"),
	CONSTRAINT "FK__RiskInher__risk___23BE4960" FOREIGN KEY ("risk_id") REFERENCES "Risks" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.RiskProcesses
CREATE TABLE IF NOT EXISTS "RiskProcesses" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"risk_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"process_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	FOREIGN KEY INDEX "FK__RiskProce__proce__24B26D99" ("process_id"),
	FOREIGN KEY INDEX "FK__RiskProce__proce__25A691D2" ("process_id"),
	FOREIGN KEY INDEX "FK__RiskProce__risk___269AB60B" ("risk_id"),
	PRIMARY KEY ("id"),
	CONSTRAINT "FK__RiskProce__risk___269AB60B" FOREIGN KEY ("risk_id") REFERENCES "Risks" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE,
	CONSTRAINT "FK__RiskProce__proce__24B26D99" FOREIGN KEY ("process_id") REFERENCES "Processes" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__RiskProce__proce__25A691D2" FOREIGN KEY ("process_id") REFERENCES "Processes" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.RiskResidualAssessments
CREATE TABLE IF NOT EXISTS "RiskResidualAssessments" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"title" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"risk_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"percentage" INT NULL DEFAULT NULL,
	"value" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"modifiedBy" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"created_by" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	"residual_risk_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	FOREIGN KEY INDEX "FK__RiskResid__creat__278EDA44" ("created_by"),
	FOREIGN KEY INDEX "FK__RiskResid__creat__2882FE7D" ("created_by"),
	FOREIGN KEY INDEX "FK__RiskResid__modif__297722B6" ("modifiedBy"),
	FOREIGN KEY INDEX "FK__RiskResid__resid__2A6B46EF" ("residual_risk_id"),
	FOREIGN KEY INDEX "FK__RiskResid__resid__2B5F6B28" ("residual_risk_id"),
	FOREIGN KEY INDEX "FK__RiskResid__risk___2C538F61" ("risk_id"),
	PRIMARY KEY ("id"),
	CONSTRAINT "FK__RiskResid__risk___2C538F61" FOREIGN KEY ("risk_id") REFERENCES "Risks" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE,
	CONSTRAINT "FK__RiskResid__modif__297722B6" FOREIGN KEY ("modifiedBy") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE SET_NULL,
	CONSTRAINT "FK__RiskResid__creat__278EDA44" FOREIGN KEY ("created_by") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__RiskResid__creat__2882FE7D" FOREIGN KEY ("created_by") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__RiskResid__resid__2A6B46EF" FOREIGN KEY ("residual_risk_id") REFERENCES "Residualrisks" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__RiskResid__resid__2B5F6B28" FOREIGN KEY ("residual_risk_id") REFERENCES "Residualrisks" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.Risks
CREATE TABLE IF NOT EXISTS "Risks" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(4000) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"sub_process" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"description" NVARCHAR(4000) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"inherent_value" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"inherent_frequency" INT NULL DEFAULT NULL,
	"inherent_financial_value" INT NULL DEFAULT NULL,
	"residual_value" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"event" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"approve" BIT NOT NULL DEFAULT '(1)',
	"created_by" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"code" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"isDeleted" BIT NOT NULL DEFAULT '(0)',
	"modifiedBy" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	"NameHash" VARBINARY NULL DEFAULT NULL,
	UNIQUE INDEX "UQ__Risks__357D4CF909F66E63" ("code"),
	FOREIGN KEY INDEX "FK__Risks__created_b__2D47B39A" ("created_by"),
	FOREIGN KEY INDEX "FK__Risks__created_b__2E3BD7D3" ("created_by"),
	FOREIGN KEY INDEX "FK__Risks__event__2F2FFC0C" ("event"),
	FOREIGN KEY INDEX "FK__Risks__modifiedB__30242045" ("modifiedBy"),
	FOREIGN KEY INDEX "FK__Risks__modifiedB__3118447E" ("modifiedBy"),
	PRIMARY KEY ("id"),
	CONSTRAINT "FK__Risks__event__2F2FFC0C" FOREIGN KEY ("event") REFERENCES "EventTypes" ("id") ON UPDATE NO_ACTION ON DELETE SET_NULL,
	CONSTRAINT "FK__Risks__created_b__2D47B39A" FOREIGN KEY ("created_by") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Risks__created_b__2E3BD7D3" FOREIGN KEY ("created_by") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Risks__modifiedB__30242045" FOREIGN KEY ("modifiedBy") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__Risks__modifiedB__3118447E" FOREIGN KEY ("modifiedBy") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.RootCauses
CREATE TABLE IF NOT EXISTS "RootCauses" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"description" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"isDeleted" BIT NOT NULL DEFAULT '(0)',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.SchemaAuditLog
CREATE TABLE IF NOT EXISTS "SchemaAuditLog" (
	"Id" INT NOT NULL,
	"EventData" XML NULL DEFAULT NULL,
	"EventType" NVARCHAR(100) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"PostTime" DATETIME NULL DEFAULT 'getdate()',
	PRIMARY KEY ("Id")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.sections
CREATE TABLE IF NOT EXISTS "sections" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"title" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"content" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"order" INT NULL DEFAULT NULL,
	"created_by" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"template_id" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"preparerStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"preparerStart" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"preparerId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"checkerStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"checkerComment" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"checkerId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"reviewerStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"reviewerComment" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"reviewerId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"acceptanceStatus" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"acceptanceComment" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"acceptanceId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"preparerIdGroup" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"checkerIdGroup" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"functionId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"isDeleted" BIT NULL DEFAULT '(0)',
	"isDraft" BIT NULL DEFAULT '(0)',
	"viewType" NVARCHAR(255) NOT NULL DEFAULT 'N''custom''' COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"selectedTemplate" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	FOREIGN KEY INDEX "FK__sections__accept__320C68B7" ("acceptanceId"),
	FOREIGN KEY INDEX "FK__sections__accept__33008CF0" ("acceptanceId"),
	FOREIGN KEY INDEX "FK__sections__checke__33F4B129" ("checkerId"),
	FOREIGN KEY INDEX "FK__sections__checke__34E8D562" ("checkerIdGroup"),
	FOREIGN KEY INDEX "FK__sections__checke__35DCF99B" ("checkerId"),
	FOREIGN KEY INDEX "FK__sections__checke__36D11DD4" ("checkerIdGroup"),
	FOREIGN KEY INDEX "FK__sections__create__37C5420D" ("created_by"),
	FOREIGN KEY INDEX "FK__sections__functi__38B96646" ("functionId"),
	FOREIGN KEY INDEX "FK__sections__functi__39AD8A7F" ("functionId"),
	FOREIGN KEY INDEX "FK__sections__prepar__3AA1AEB8" ("preparerId"),
	FOREIGN KEY INDEX "FK__sections__prepar__3B95D2F1" ("preparerIdGroup"),
	FOREIGN KEY INDEX "FK__sections__prepar__3C89F72A" ("preparerId"),
	FOREIGN KEY INDEX "FK__sections__prepar__3D7E1B63" ("preparerIdGroup"),
	FOREIGN KEY INDEX "FK__sections__review__3E723F9C" ("reviewerId"),
	FOREIGN KEY INDEX "FK__sections__review__3F6663D5" ("reviewerId"),
	FOREIGN KEY INDEX "FK__sections__templa__405A880E" ("template_id"),
	PRIMARY KEY ("id"),
	CONSTRAINT "FK__sections__create__37C5420D" FOREIGN KEY ("created_by") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE SET_NULL,
	CONSTRAINT "FK__sections__templa__405A880E" FOREIGN KEY ("template_id") REFERENCES "templates" ("id") ON UPDATE NO_ACTION ON DELETE SET_NULL,
	CONSTRAINT "FK__sections__prepar__3AA1AEB8" FOREIGN KEY ("preparerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__sections__prepar__3C89F72A" FOREIGN KEY ("preparerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__sections__checke__33F4B129" FOREIGN KEY ("checkerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__sections__checke__35DCF99B" FOREIGN KEY ("checkerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__sections__review__3E723F9C" FOREIGN KEY ("reviewerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__sections__review__3F6663D5" FOREIGN KEY ("reviewerId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__sections__accept__320C68B7" FOREIGN KEY ("acceptanceId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__sections__accept__33008CF0" FOREIGN KEY ("acceptanceId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__sections__prepar__3B95D2F1" FOREIGN KEY ("preparerIdGroup") REFERENCES "Groups" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__sections__prepar__3D7E1B63" FOREIGN KEY ("preparerIdGroup") REFERENCES "Groups" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__sections__checke__34E8D562" FOREIGN KEY ("checkerIdGroup") REFERENCES "Groups" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__sections__checke__36D11DD4" FOREIGN KEY ("checkerIdGroup") REFERENCES "Groups" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__sections__functi__38B96646" FOREIGN KEY ("functionId") REFERENCES "Functions" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__sections__functi__39AD8A7F" FOREIGN KEY ("functionId") REFERENCES "Functions" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "CK__sections__accept__041093DD" CHECK (([acceptanceStatus]=N'refused' OR [acceptanceStatus]=N'approved' OR [acceptanceStatus]=N'pending')),
	CONSTRAINT "CK__sections__accept__0504B816" CHECK (([acceptanceStatus]=N'refused' OR [acceptanceStatus]=N'approved' OR [acceptanceStatus]=N'pending')),
	CONSTRAINT "CK__sections__checke__05F8DC4F" CHECK (([checkerStatus]=N'refused' OR [checkerStatus]=N'approved' OR [checkerStatus]=N'pending')),
	CONSTRAINT "CK__sections__checke__06ED0088" CHECK (([checkerStatus]=N'refused' OR [checkerStatus]=N'approved' OR [checkerStatus]=N'pending')),
	CONSTRAINT "CK__sections__prepar__07E124C1" CHECK (([preparerStatus]=N'sent' OR [preparerStatus]=N'draft')),
	CONSTRAINT "CK__sections__prepar__08D548FA" CHECK (([preparerStatus]=N'sent' OR [preparerStatus]=N'draft')),
	CONSTRAINT "CK__sections__review__09C96D33" CHECK (([reviewerStatus]=N'sent' OR [reviewerStatus]=N'pending')),
	CONSTRAINT "CK__sections__review__0ABD916C" CHECK (([reviewerStatus]=N'sent' OR [reviewerStatus]=N'pending'))
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.SequelizeMeta
CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
	"name" NVARCHAR(255) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	UNIQUE INDEX "UQ__Sequeliz__72E12F1B1A6D521D" ("name"),
	PRIMARY KEY ("name")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.SubBusinessUnits
CREATE TABLE IF NOT EXISTS "SubBusinessUnits" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(255) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"description" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"businessUnitId" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	FOREIGN KEY INDEX "FK__SubBusine__busin__414EAC47" ("businessUnitId"),
	FOREIGN KEY INDEX "FK__SubBusine__busin__4242D080" ("businessUnitId"),
	PRIMARY KEY ("id"),
	CONSTRAINT "FK__SubBusine__busin__414EAC47" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnits" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION,
	CONSTRAINT "FK__SubBusine__busin__4242D080" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnits" ("id") ON UPDATE NO_ACTION ON DELETE NO_ACTION
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.SubFunctions
CREATE TABLE IF NOT EXISTS "SubFunctions" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"description" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"code" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"function_id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"isDeleted" BIT NOT NULL DEFAULT '(0)',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	UNIQUE INDEX "UQ__SubFunct__357D4CF9D80F9513" ("code"),
	FOREIGN KEY INDEX "FK__SubFuncti__funct__4336F4B9" ("function_id"),
	PRIMARY KEY ("id"),
	CONSTRAINT "FK__SubFuncti__funct__4336F4B9" FOREIGN KEY ("function_id") REFERENCES "Functions" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.survey_assessment
CREATE TABLE IF NOT EXISTS "survey_assessment" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"quarter" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"year" INT NULL DEFAULT NULL,
	"surveyId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"questionId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"userId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"answer" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	FOREIGN KEY INDEX "FK__survey_as__quest__442B18F2" ("questionId"),
	FOREIGN KEY INDEX "FK__survey_as__surve__451F3D2B" ("surveyId"),
	FOREIGN KEY INDEX "FK__survey_as__userI__46136164" ("userId"),
	PRIMARY KEY ("id"),
	CONSTRAINT "FK__survey_as__surve__451F3D2B" FOREIGN KEY ("surveyId") REFERENCES "PublicSurveys" ("id") ON UPDATE NO_ACTION ON DELETE SET_NULL,
	CONSTRAINT "FK__survey_as__quest__442B18F2" FOREIGN KEY ("questionId") REFERENCES "BankQuestions" ("id") ON UPDATE NO_ACTION ON DELETE SET_NULL,
	CONSTRAINT "FK__survey_as__userI__46136164" FOREIGN KEY ("userId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE SET_NULL
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.survey_impacted_area
CREATE TABLE IF NOT EXISTS "survey_impacted_area" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"complianceControlActionId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"impactedAreaId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.Systems
CREATE TABLE IF NOT EXISTS "Systems" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"description" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"code" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"isDeleted" BIT NOT NULL DEFAULT '(0)',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	UNIQUE INDEX "UQ__Systems__357D4CF9EF817C54" ("code"),
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.Targets
CREATE TABLE IF NOT EXISTS "Targets" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"timestamp" DATETIMEOFFSET NOT NULL,
	"userId" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"action" NVARCHAR(255) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"result" NVARCHAR(255) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"targetObject" NVARCHAR(255) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"description" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	FOREIGN KEY INDEX "FK__Targets__userId__4707859D" ("userId"),
	PRIMARY KEY ("id"),
	CONSTRAINT "FK__Targets__userId__4707859D" FOREIGN KEY ("userId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.templates
CREATE TABLE IF NOT EXISTS "templates" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"title" NVARCHAR(255) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"isDeleted" BIT NULL DEFAULT '(0)',
	"year" INT NULL DEFAULT NULL,
	"quarter" VARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	CONSTRAINT "CK__templates__quart__0BB1B5A5" CHECK (([quarter]=N'quarterFour' OR [quarter]=N'quarterThree' OR [quarter]=N'quarterTwo' OR [quarter]=N'quarterOne')),
	CONSTRAINT "CK__templates__quart__0CA5D9DE" CHECK (([quarter]=N'quarterFour' OR [quarter]=N'quarterThree' OR [quarter]=N'quarterTwo' OR [quarter]=N'quarterOne'))
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.Updated_Incident
CREATE TABLE IF NOT EXISTS "Updated_Incident" (
	"id" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Loss_Event_ID" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Date_of_Reporting_to_ORM" DATE NULL DEFAULT NULL,
	"Date_of_Occurrence" DATE NULL DEFAULT NULL,
	"Concerned_Department" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Regulatory_Business_Activity" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Title" NVARCHAR(150) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Issue_Description" NVARCHAR(3350) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Root_Cause" NVARCHAR(500) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Sub_Category_MIS" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Discovered_Type" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Total_loss" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Recoveries" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Net_Loss" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Currency" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Net_LCY" FLOAT NULL DEFAULT NULL,
	"Recovery_Status" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Event_Type" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Cause_of_Incident" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Risk_Category" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Financial_Impact" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Loss_Event_Type_Status" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Action_Taken" NVARCHAR(max) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Current_Status" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Linked_to_KRI" BIT NULL DEFAULT NULL,
	"Linked_to_RCM" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"Last_Follow_Up_Date" DATE NULL DEFAULT NULL,
	"Importance" NVARCHAR(50) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"TimeFrame" SMALLINT NULL DEFAULT NULL
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.UserFunction
CREATE TABLE IF NOT EXISTS "UserFunction" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"userId" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"functionId" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	FOREIGN KEY INDEX "FK__UserFunct__funct__47FBA9D6" ("functionId"),
	FOREIGN KEY INDEX "FK__UserFunct__userI__48EFCE0F" ("userId"),
	PRIMARY KEY ("id"),
	CONSTRAINT "FK__UserFunct__userI__48EFCE0F" FOREIGN KEY ("userId") REFERENCES "Users" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE,
	CONSTRAINT "FK__UserFunct__funct__47FBA9D6" FOREIGN KEY ("functionId") REFERENCES "Functions" ("id") ON UPDATE NO_ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table NEWDCC-V4-UAT.Users
CREATE TABLE IF NOT EXISTS "Users" (
	"id" CHAR(36) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"email" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"name" NVARCHAR(255) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"username" NVARCHAR(255) NOT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"title" NVARCHAR(255) NULL DEFAULT '''No Title''' COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"active" BIT NOT NULL DEFAULT '(0)',
	"groupId" CHAR(36) NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	"failedLoginAttempts" INT NOT NULL DEFAULT '(0)',
	"isLocked" BIT NOT NULL DEFAULT '(0)',
	"lastLogin" DATETIMEOFFSET NULL DEFAULT NULL,
	"createdAt" DATETIMEOFFSET NOT NULL,
	"updatedAt" DATETIMEOFFSET NOT NULL,
	"deletedAt" DATETIMEOFFSET NULL DEFAULT NULL,
	"isSessionActive" BIT NULL DEFAULT NULL,
	"currentToken" TEXT NULL DEFAULT NULL COLLATE 'SQL_Latin1_General_CP1_CI_AS',
	FOREIGN KEY INDEX "FK__Users__groupId__49E3F248" ("groupId"),
	PRIMARY KEY ("id"),
	CONSTRAINT "FK__Users__groupId__49E3F248" FOREIGN KEY ("groupId") REFERENCES "Groups" ("id") ON UPDATE NO_ACTION ON DELETE SET_NULL
);

-- Data exporting was unselected.

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
