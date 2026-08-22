import { prisma } from '../db';
import { supabase } from '../utils/supabase';

export class AuthService {
  public static async login(email: string, plainPassword: string) {
    // 1. Try Supabase Auth if configured
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: plainPassword,
      });

      if (error || !data.session) {
        throw { statusCode: 401, message: error?.message || 'Incorrect email or password' };
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw { statusCode: 401, message: 'User profile not found' };
      }

      return {
        access_token: data.session.access_token,
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

    // 2. Local Fallback (Development without Supabase credentials)
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw { statusCode: 401, message: 'Incorrect email or password' };
    }

    return {
      access_token: `demo_tok_${user.id}`,
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
