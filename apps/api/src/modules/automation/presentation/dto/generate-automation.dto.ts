import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class GenerateAutomationDto {
  @ApiProperty({ enum: ['API', 'UI'] })
  @IsIn(['API', 'UI'])
  automationType!: 'API' | 'UI';
}
