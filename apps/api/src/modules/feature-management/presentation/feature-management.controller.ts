import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

// Presentation layer: HTTP entrypoints only. Delegates to Application-layer
// command/query handlers -- never touches Domain or Infrastructure directly.
@ApiTags('FeatureManagement')
@Controller('feature-flags')
export class FeatureManagementController {}
