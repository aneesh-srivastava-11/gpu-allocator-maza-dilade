import { UserRepository } from '../repositories/user.repository';
import { verifyPassword } from '../utils/hashing';
import { createAccessToken } from '../utils/jwt';

export class AuthService {
  public static async login(email: string, plainPassword: string) {
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      throw { statusCode: 401, message: 'Incorrect email or password' };
    }

    const isValid = await verifyPassword(plainPassword, user.passwordHash);
    if (!isValid) {
      throw { statusCode: 401, message: 'Incorrect email or password' };
    }

    const token = createAccessToken({
      sub: user.email,
      id: user.id,
      role: user.role,
    });

    return {
      access_token: token,
      token_type: 'bearer',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        roll_number: user.rollNumber,
        account_status: user.accountStatus,
        managed_lab_ids: user.managedLabIds || [],
      },
    };
  }
}
