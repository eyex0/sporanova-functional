CREATE TABLE `data_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`dataSourceId` int NOT NULL,
	`externalId` varchar(255) NOT NULL,
	`payload` json NOT NULL,
	`searchableText` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `data_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `data_records_source_external_unique` UNIQUE(`dataSourceId`,`externalId`)
);
--> statement-breakpoint
ALTER TABLE `data_records` ADD CONSTRAINT `data_records_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `data_records` ADD CONSTRAINT `data_records_dataSourceId_data_sources_id_fk` FOREIGN KEY (`dataSourceId`) REFERENCES `data_sources`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `data_records_workspace_source_idx` ON `data_records` (`workspaceId`,`dataSourceId`);