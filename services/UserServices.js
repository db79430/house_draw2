import UserRepository from '../repositories/UserRepository.js';
import Helpers from '../utils/Helpers.js';

class UserService {
  async createUserSession(formData) {
    try {
      const result = await UserRepository.createUserWithPayment(formData);
      console.log('✅ User session created:', result.user.order_id);
      return result;
    } catch (error) {
      console.error('❌ Error creating user session:', error);
      throw error;
    }
  }

  async completeUserSession(orderId, tinkoffPaymentId, tinkoffStatus) {
    try {
      const user = await UserRepository.completeUserPayment(
        orderId, 
        tinkoffPaymentId, 
        tinkoffStatus
      );
      console.log('✅ User session completed:', orderId);
      return user;
    } catch (error) {
      console.error('❌ Error completing user session:', error);
      throw error;
    }
  }

  async getUserSession(orderId) {
    try {
      return await UserRepository.getUserByOrderId(orderId);
    } catch (error) {
      console.error('❌ Error getting user session:', error);
      return null;
    }
  }

  async getUserByEmail(email) {
    try {
      return await UserRepository.getUserPaymentHistory(email);
    } catch (error) {
      console.error('❌ Error getting user by email:', error);
      return [];
    }
  }

  async getSystemStats() {
    try {
      return await UserRepository.getSystemStatistics();
    } catch (error) {
      console.error('❌ Error getting system stats:', error);
      return {};
    }
  }

  generateCredentials() {
    return Helpers.generateCredentials();
  }
}

export default UserService;