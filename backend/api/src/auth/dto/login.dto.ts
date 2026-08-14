import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { PASSWORD_MAX_LENGTH } from '../auth.constants';

export class LoginDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}
