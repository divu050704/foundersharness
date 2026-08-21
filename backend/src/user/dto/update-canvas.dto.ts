import { PartialType } from '@nestjs/mapped-types';
import { CreateCanvasDTO } from './create-canvas.dto';

export class UpdateCanvasDTO extends PartialType(CreateCanvasDTO) {}
