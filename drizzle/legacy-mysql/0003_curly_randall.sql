CREATE TABLE `jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int,
	`type` varchar(80) NOT NULL,
	`status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
	`payload` json NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`maxAttempts` int NOT NULL DEFAULT 3,
	`runAt` timestamp NOT NULL DEFAULT (now()),
	`lockedAt` timestamp,
	`lockedBy` varchar(128),
	`completedAt` timestamp,
	`lastError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `jobs` ADD CONSTRAINT `jobs_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `jobs_dispatch_idx` ON `jobs` (`status`,`runAt`);--> statement-breakpoint
CREATE INDEX `jobs_workspace_idx` ON `jobs` (`workspaceId`,`createdAt`);