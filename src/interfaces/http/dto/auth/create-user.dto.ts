import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

const KNOWLEDGE_ROLES = [
  'SUPER_ADMIN',
  'TENANT_ADMIN',
  'KNOWLEDGE_SUPERVISOR',
  'KNOWLEDGE_UPLOADER',
  'AUDITOR',
  'CHAT_USER',
];

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(4)
  password!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsIn(['FREE', 'ACADEMIC', 'PLUS', 'ADMIN'])
  role!: string;

  @IsOptional()
  @IsIn(KNOWLEDGE_ROLES)
  knowledgeRole?: string;
}

export class SetKnowledgeRoleDto {
  @IsIn(KNOWLEDGE_ROLES)
  knowledgeRole!: string;
}
