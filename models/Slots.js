// models/Slot.js
import db from '../database/index.js';

class Slot {
  static async create(slotData) {
    const {
      userId,
      slotNumber,
      purchaseDate,
      status = 'active'
    } = slotData;

    const query = `
      INSERT INTO slots (user_id, slot_number, purchase_date, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [userId, slotNumber, purchaseDate, status];

    try {
      const result = await db.one(query, values);
      console.log('✅ Slot created:', result.slot_number);
      return result;
    } catch (error) {
      console.error('❌ Error creating slot:', error);
      throw error;
    }
  }

  static async findByUserIdSlots(userId) {
    try {
      const query = `
        SELECT * FROM slots 
        WHERE user_id = $1 
        ORDER BY purchase_date DESC
      `;
      return await db.any(query, [userId]);
    } catch (error) {
      console.error('❌ Error finding slots by user ID:', error);
      throw error;
    }
  }

  static async generateSlotNumber() {
    // Генерация уникального номера слота
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `SLOT-${timestamp}-${random}`;
  }

  static async createMultipleSlots(userId, count) {
    try {
        const slots = [];
        const createdSlots = [];
        
        for (let i = 0; i < count; i++) {
            const slotNumber = await this.generateSlotNumber();
            const slot = await this.create({
                userId,
                slotNumber,
                purchaseDate: new Date(),
                status: 'active' // 🔥 ИСПРАВЛЕНО: добавляем статус
            });
            createdSlots.push(slot);
        }
        
        console.log(`✅ Created ${createdSlots.length} slots for user: ${userId}`);
        return createdSlots;
        
    } catch (error) {
        console.error('❌ Error creating multiple slots:', error);
        throw error;
    }
  }

  static async getAvailableSlotsCount() {
    try {
      const query = `
        SELECT COUNT(*) as available_slots 
        FROM slots 
        WHERE status = 'available'
      `;
      const result = await db.one(query);
      return parseInt(result.available_slots);
    } catch (error) {
      console.error('❌ Error getting available slots count:', error);
      return 0;
    }
  }
}

export default Slot;