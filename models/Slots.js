// models/Slot.js
import db from '../database/index.js';

class Slot {
  static TOTAL_SLOTS = 20000;
  static SLOT_PREFIX = 'SLOT';

  static async create(slotData) {
    const {
      userId,
      slotNumber,
      purchaseDate,
      status = 'active'
    } = slotData;

    const query = `
      INSERT INTO slots (user_id, slot_number, purchase_date, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    // const metadata = {
    //   created_at: new Date().toISOString(),
    //   original_number: this.extractSlotNumber(slotNumber),
    //   is_range_slot: true
    // };

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

  /**
   * Извлечение числовой части из номера слота
   */
  static extractSlotNumber(slotNumber) {
    const match = slotNumber.match(/^SLOT-(\d+)$/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Форматирование номера слота (добавление ведущих нулей)
   */
  static formatSlotNumber(number) {
    return `${this.SLOT_PREFIX}-${String(number).padStart(5, '0')}`;
  }

  /**
   * Генерация номера слота из диапазона 1-20000
   */
  static async generateSlotNumberInRange() {
    try {
      // 1. Получаем все занятые номера
      const occupiedNumbers = await this.getOccupiedSlotNumbers();

      // 2. Ищем свободный номер в диапазоне
      for (let i = 1; i <= this.TOTAL_SLOTS; i++) {
        if (!occupiedNumbers.has(i)) {
          const slotNumber = this.formatSlotNumber(i);
          console.log(`🔢 Generated slot number from range: ${slotNumber} (#${i})`);
          return slotNumber;
        }
      }

      // 3. Если все слоты заняты - используем расширенный диапазон
      console.warn('⚠️  All slots 1-20000 are occupied, using extended range');
      return await this.generateFallbackSlotNumber();

    } catch (error) {
      console.error('❌ Error generating slot number in range:', error);
      return await this.generateFallbackSlotNumber();
    }
  }

  /**
   * Получение всех занятых номеров слотов (1-20000)
   */
  static async getOccupiedSlotNumbers() {
    try {
      const query = `
        SELECT slot_number 
        FROM slots 
        WHERE slot_number ~ '^SLOT-\\d+$'
      `;

      const result = await db.any(query);
      const occupiedNumbers = new Set();

      result.forEach(row => {
        const number = this.extractSlotNumber(row.slot_number);
        if (number !== null && number >= 1 && number <= this.TOTAL_SLOTS) {
          occupiedNumbers.add(number);
        }
      });

      console.log(`📊 Found ${occupiedNumbers.size} occupied slots in range 1-${this.TOTAL_SLOTS}`);
      return occupiedNumbers;

    } catch (error) {
      console.error('❌ Error getting occupied slot numbers:', error);
      return new Set();
    }
  }

  /**
   * Резервный метод генерации (если все слоты заняты)
   */
  static async generateFallbackSlotNumber() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    const slotNumber = `${this.SLOT_PREFIX}-EXT-${timestamp}-${random}`;

    console.log(`🔢 Generated fallback slot number: ${slotNumber}`);
    return slotNumber;
  }

  /**
   * Генерация нескольких номеров слотов из диапазона
   */
  static async generateMultipleSlotNumbers(count) {
    try {
      // Получаем занятые номера
      const occupiedNumbers = await this.getOccupiedSlotNumbers();

      // Ищем свободные номера
      const availableNumbers = [];
      for (let i = 1; i <= this.TOTAL_SLOTS && availableNumbers.length < count; i++) {
        if (!occupiedNumbers.has(i)) {
          availableNumbers.push(i);
        }
      }

      if (availableNumbers.length < count) {
        throw new Error(`Only ${availableNumbers.length} slots available in range 1-${this.TOTAL_SLOTS}. Requested: ${count}`);
      }

      // Форматируем номера
      const slotNumbers = availableNumbers.map(num => this.formatSlotNumber(num));

      console.log(`🔢 Generated ${slotNumbers.length} slot numbers: ${slotNumbers.join(', ')}`);
      return slotNumbers;

    } catch (error) {
      console.error('❌ Error generating multiple slot numbers:', error);
      throw error;
    }
  }

  /**
   * Создание нескольких слотов с номерами из диапазона 1-20000
   */
  static async createMultipleSlotsInRange(userId, count, paymentId = null) {
    try {
      console.log(`🎯 Creating ${count} slots for user ${userId}`);
      
      if (!userId || count <= 0) {
        throw new Error('Invalid parameters for slot creation');
      }
  
      // Получаем занятые номера
      const occupiedNumbers = await this.getOccupiedSlotNumbers();
      
      // Ищем свободные номера
      const availableNumbers = [];
      for (let i = 1; i <= this.TOTAL_SLOTS && availableNumbers.length < count; i++) {
        if (!occupiedNumbers.has(i)) {
          availableNumbers.push(i);
        }
      }
      
      if (availableNumbers.length < count) {
        throw new Error(`Only ${availableNumbers.length} slots available. Requested: ${count}`);
      }
      
      // Форматируем номера
      const slotNumbers = availableNumbers.map(num => this.formatSlotNumber(num));
      
      console.log(`🔢 Generated ${slotNumbers.length} slot numbers:`, slotNumbers);
  
      // Создаем слоты БЕЗ metadata
      const createdSlots = [];
      const purchaseDate = new Date();
      
      for (let i = 0; i < count; i++) {
        const slotNumber = slotNumbers[i];
        
        const slot = await this.create({
          userId: userId,
          slotNumber: slotNumber,
          purchaseDate: purchaseDate,
          status: 'active'
        });
        
        createdSlots.push(slot);
        console.log(`✅ Created slot ${i + 1}/${count}: ${slotNumber}`);
      }
      
      console.log(`🎉 Successfully created ${createdSlots.length} slots for user ${userId}`);
      
      return {
        success: true,
        slots: createdSlots,
        summary: {
          userId,
          totalSlots: createdSlots.length,
          slotNumbers: slotNumbers,
          firstSlot: slotNumbers[0],
          lastSlot: slotNumbers[slotNumbers.length - 1],
          purchaseDate: purchaseDate
        }
      };
      
    } catch (error) {
      console.error('❌ Error creating multiple slots in range:', error);
      
      return {
        success: false,
        error: error.message,
        partial: createdSlots ? createdSlots.length : 0
      };
    }
  }

  /**
   * Создание нескольких слотов (совместимость со старым кодом)
   */
  static async createMultipleSlots(userId, count) {
    return await this.createMultipleSlotsInRange(userId, count);
  }

  /**
   * Получение слотов пользователя с дополнительной информацией
   */
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
        return []; // Возвращаем пустой массив при ошибке
    }
}

  /**
   * Группировка слотов по покупкам
   */
  static groupSlotsByPurchase(slots) {
    const groups = {};

    slots.forEach(slot => {
      const key = slot.payment_id || slot.purchase_date?.toISOString().split('T')[0] || 'unknown';

      if (!groups[key]) {
        groups[key] = {
          purchase_date: slot.purchase_date,
          payment_id: slot.payment_id,
          slots: [],
          count: 0
        };
      }

      groups[key].slots.push(slot);
      groups[key].count++;
    });

    return Object.values(groups);
  }

  /**
   * Извлечение диапазонов слотов
   */
  static extractSlotRanges(slots) {
    const numericSlots = slots
      .map(slot => this.extractSlotNumber(slot.slot_number))
      .filter(num => num !== null)
      .sort((a, b) => a - b);

    if (numericSlots.length === 0) return [];

    const ranges = [];
    let start = numericSlots[0];
    let end = numericSlots[0];

    for (let i = 1; i < numericSlots.length; i++) {
      if (numericSlots[i] === end + 1) {
        end = numericSlots[i];
      } else {
        ranges.push({ start, end });
        start = end = numericSlots[i];
      }
    }

    ranges.push({ start, end });

    return ranges.map(range => ({
      range: `${range.start} - ${range.end}`,
      count: range.end - range.start + 1,
      slots: Array.from({ length: range.end - range.start + 1 }, (_, i) =>
        this.formatSlotNumber(range.start + i)
      )
    }));
  }

  /**
   * Получение статистики по слотам
   */
  static async getSlotStatistics() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_slots,
          COUNT(DISTINCT user_id) as total_users,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_slots,
          SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_slots,
          MIN(purchase_date) as first_purchase,
          MAX(purchase_date) as last_purchase
        FROM slots
      `;

      const result = await db.one(query);

      // Получаем информацию о диапазоне
      const rangeQuery = `
        SELECT 
          MIN(CAST(SUBSTRING(slot_number FROM '^SLOT-(\\d+)$') AS INTEGER)) as min_slot,
          MAX(CAST(SUBSTRING(slot_number FROM '^SLOT-(\\d+)$') AS INTEGER)) as max_slot
        FROM slots 
        WHERE slot_number ~ '^SLOT-\\d+$'
      `;

      const rangeResult = await db.oneOrNone(rangeQuery);

      return {
        ...result,
        slot_range: {
          min: rangeResult?.min_slot || 0,
          max: rangeResult?.max_slot || 0,
          total_available: this.TOTAL_SLOTS - parseInt(result.total_slots)
        }
      };

    } catch (error) {
      console.error('❌ Error getting slot statistics:', error);
      throw error;
    }
  }

  /**
   * Получение количества доступных слотов
   */
  static async getAvailableSlotsCount() {
    try {
      const totalOccupied = await this.getOccupiedSlotCount();
      return this.TOTAL_SLOTS - totalOccupied;
    } catch (error) {
      console.error('❌ Error getting available slots count:', error);
      return 0;
    }
  }

  /**
   * Получение количества занятых слотов
   */
  static async getOccupiedSlotCount() {
    try {
      const occupiedNumbers = await this.getOccupiedSlotNumbers();
      return occupiedNumbers.size;
    } catch (error) {
      console.error('❌ Error getting occupied slot count:', error);
      return 0;
    }
  }
}

export default Slot;