import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JiraCommentDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional({ nullable: true }) author!: string | null;
  @ApiProperty() body!: string;
  @ApiPropertyOptional({ nullable: true }) createdAt!: string | null;
}

export class JiraAttachmentDto {
  @ApiProperty() filename!: string;
  @ApiPropertyOptional({ nullable: true }) mimeType!: string | null;
  @ApiPropertyOptional({ nullable: true }) sizeBytes!: number | null;
  @ApiPropertyOptional({ nullable: true }) url!: string | null;
}

export class JiraLinkDto {
  @ApiProperty() type!: string;
  @ApiProperty() externalId!: string;
}

// Every Jira field available for a story (Bug 4's "View Full Story" drawer).
export class JiraStoryDetailDto {
  @ApiProperty() externalId!: string;
  @ApiProperty() title!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiPropertyOptional({ nullable: true }) acceptanceCriteria!: string | null;
  @ApiProperty() status!: string;
  @ApiPropertyOptional({ nullable: true }) priority!: string | null;
  @ApiPropertyOptional({ nullable: true }) assignee!: string | null;
  @ApiPropertyOptional({ nullable: true }) reporter!: string | null;
  @ApiProperty({ type: [String] }) labels!: string[];
  @ApiProperty({ type: [String] }) components!: string[];
  @ApiPropertyOptional({ nullable: true }) epic!: string | null;
  @ApiPropertyOptional({ nullable: true }) epicKey!: string | null;
  @ApiPropertyOptional({ nullable: true }) parent!: string | null;
  @ApiPropertyOptional({ nullable: true }) storyPoints!: number | null;
  @ApiPropertyOptional({ nullable: true }) dueDate!: string | null;
  @ApiPropertyOptional({ nullable: true }) createdAt!: string | null;
  @ApiPropertyOptional({ nullable: true }) updatedAt!: string | null;
  @ApiPropertyOptional({ nullable: true }) environment!: string | null;
  @ApiProperty({ type: [JiraCommentDto] }) comments!: JiraCommentDto[];
  @ApiProperty({ type: [JiraAttachmentDto] }) attachments!: JiraAttachmentDto[];
  @ApiProperty({ type: [JiraLinkDto] }) links!: JiraLinkDto[];
  @ApiProperty() issueType!: string;
  @ApiProperty({ type: Object }) additionalCustomFields!: Record<string, unknown>;
}
