CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerOpenId` varchar(64),
	`action` varchar(80) NOT NULL,
	`entityType` varchar(60) NOT NULL,
	`entityId` int,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customer_id` int NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`mode` varchar(12) NOT NULL,
	`sourceEventIds` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `customers` ADD `ownerOpenId` varchar(64);--> statement-breakpoint
ALTER TABLE `customers` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `events` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `audit_logs_owner_created_idx` ON `audit_logs` (`ownerOpenId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `conversations_customer_created_idx` ON `conversations` (`customer_id`,`createdAt`);