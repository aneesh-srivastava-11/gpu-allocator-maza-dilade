import { UserRepository } from '../repositories/user.repository';
import { StorageService } from './storage.service';
import { OcrService } from './ocr.service';
import { AccountStatus, Role } from '@prisma/client';
import { AuditRepository } from '../repositories/audit.repository';
import { wsManager } from '../ws/manager';
import { supabase } from '../utils/supabase';

export class AccountService {
  public static async createStudentSignup(data: {
    name: string;
    email: string;
    rollNumber?: string;
    department?: string;
    password: string;
    idCardBuffer?: Buffer;
    idCardFilename?: string;
  }) {
    const existing = await UserRepository.findByEmail(data.email);
    if (existing) {
      throw { statusCode: 400, message: 'An account with this email already exists' };
    }

    let imageUrl: string | undefined;
    let extractedName: string | undefined;
    let isMatch: boolean | undefined;

    if (data.idCardBuffer) {
      imageUrl = await StorageService.uploadIdCard(
        data.idCardBuffer,
        data.idCardFilename || 'id_card.jpg'
      );

      const ocrResult = await OcrService.processIdCard(data.idCardBuffer, data.name);
      extractedName = ocrResult.extractedName;
      isMatch = ocrResult.isMatch;
    }

    // Register user in Supabase Auth if configured
    if (supabase) {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            roll_number: data.rollNumber,
            department: data.department,
            role: 'student',
            account_status: 'pending_review',
          },
        },
      });

      if (error) {
        throw { statusCode: 400, message: error.message };
      }
    }

    const user = await UserRepository.create({
      name: data.name,
      email: data.email,
      rollNumber: data.rollNumber,
      department: data.department,
      role: Role.student,
      passwordHash: 'SUPABASE_MANAGED_AUTH',
      idCardImageUrl: imageUrl,
      idOcrExtractedName: extractedName,
      idNameMatch: isMatch,
      accountStatus: AccountStatus.pending_review,
    });

    wsManager.broadcast('NEW_PENDING_ACCOUNT', {
      user_id: user.id,
      name: user.name,
      roll_number: user.rollNumber,
      id_name_match: user.idNameMatch,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      account_status: user.accountStatus,
      id_name_match: user.idNameMatch,
      id_ocr_extracted_name: user.idOcrExtractedName,
      message: 'Account created successfully and is pending Lab Incharge review.',
    };
  }

  public static async getPendingAccounts() {
    const pending = await UserRepository.findPendingAccounts();
    return pending.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      roll_number: u.rollNumber,
      department: u.department,
      id_card_image_url: u.idCardImageUrl,
      id_ocr_extracted_name: u.idOcrExtractedName,
      id_name_match: u.idNameMatch,
      created_at: u.createdAt,
    }));
  }

  public static async approveAccount(userId: number, actorId: number) {
    const user = await UserRepository.findById(userId);
    if (!user) throw { statusCode: 404, message: 'User not found' };

    const updated = await UserRepository.updateAccountStatus(userId, AccountStatus.active);

    await AuditRepository.log(
      actorId,
      'APPROVE_ACCOUNT',
      'USER',
      userId,
      { student_name: user.name }
    );

    wsManager.broadcast('ACCOUNT_APPROVED', { user_id: userId, name: user.name });

    return { message: `Account for ${user.name} approved successfully.`, status: updated.accountStatus };
  }

  public static async rejectAccount(userId: number, actorId: number) {
    const user = await UserRepository.findById(userId);
    if (!user) throw { statusCode: 404, message: 'User not found' };

    const updated = await UserRepository.updateAccountStatus(userId, AccountStatus.rejected);

    await AuditRepository.log(
      actorId,
      'REJECT_ACCOUNT',
      'USER',
      userId,
      { student_name: user.name }
    );

    wsManager.broadcast('ACCOUNT_REJECTED', { user_id: userId, name: user.name });

    return { message: `Account for ${user.name} rejected.`, status: updated.accountStatus };
  }
}
