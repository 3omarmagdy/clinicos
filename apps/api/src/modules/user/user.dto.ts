import { IsEmail, IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateTeamMemberDto {
  @IsString() @MinLength(1) @MaxLength(80) firstName!: string;
  @IsString() @MinLength(1) @MaxLength(80) lastName!: string;
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @MinLength(10) @MaxLength(128)
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, { message: 'Password must include at least one letter and one number' })
  password!: string;
  @IsIn(['admin', 'doctor', 'receptionist']) role!: 'admin' | 'doctor' | 'receptionist';
}

export class SetTeamMemberPasswordDto {
  @IsString() @MinLength(10) @MaxLength(128)
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, { message: 'Password must include at least one letter and one number' })
  password!: string;
}
