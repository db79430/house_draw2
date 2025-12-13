// services/SlotService.js
import Slot from '../models/Slots.js';
import Payment from '../models/Payment.js';
import TinkoffService from '../services/TinkoffService.js';
import CONFIG from '../config/index.js';
import User from '../models/Users.js';
import TokenGenerator from '../utils/tokenGenerator.js';
import EmailService from './EmailServices.js';

class SlotService {
    /**
     * Покупка слотов
     */
    // services/SlotService.js - исправленный метод purchaseSlots

    async purchaseSlots(userId, slotCount) {
        try {
            console.log('🎯 Starting slot purchase:', { userId, slotCount });

            // Валидация
            if (!userId || !slotCount || slotCount <= 0) {
                throw new Error('Некорректные данные для покупки слотов');
            }

            // Находим пользователя по ID
            const user = await User.findById(userId);

            if (!user) {
                throw new Error('Пользователь не найден');
            }

            console.log('👤 Found user:', {
                id: user.id,
                memberNumber: user.membership_number,
                email: user.email,
                phone: user.phone
            });

            // Расчет суммы
            const amount = this.calculateAmount(slotCount);
            console.log('💰 Calculated amount:', amount);

            // Создаем уникальный orderId для Tinkoff
            const orderId = TokenGenerator.generateOrderId();

            const paymentData = {
                TerminalKey: CONFIG.TINKOFF.TERMINAL_KEY,
                Amount: amount,
                OrderId: orderId,
                Description: `Покупка ${slotCount} слота (ов). № пайщика: ${user.membership_number || 'Не указан'}`,
                NotificationURL: `${CONFIG.APP.BASE_URL}/payment-notification`,
                DATA: {
                    Email: user.email || '',
                    Phone: user.phone || '',
                    MemberNumber: user.memberNumber || '',
                    SlotCount: slotCount
                },
            };

            console.log('📋 Payment data prepared:', {
                OrderId: paymentData.OrderId,
                Amount: paymentData.Amount,
                Description: paymentData.Description,
                UserId: userId
            });

            const paymentCreateData = {
                orderId: orderId,
                userId: userId,
                amount: amount,
                tinkoffPaymentId: null,
                description: paymentData.Description,
                tinkoffResponse: null
            };

            console.log('📝 Creating payment with data:', paymentCreateData);

            // Создаем платеж в базе ПЕРЕД запросом к Tinkoff
            //   const payment = await Payment.create({
            //     orderId: orderId,
            //     user_id: userId,
            //     amount: amount,
            //     description: paymentData.Description,
            //     status: 'pending',
            //     metadata: {
            //       slot_count: slotCount,
            //       member_number: user.memberNumber
            //     }
            //   });

            const payment = await Payment.create(paymentCreateData);

            console.log('✅ Payment record created:', {
                id: payment.id,
                order_id: payment.order_id,
                user_id: payment.user_id, // Проверьте что здесь есть значение
                amount: payment.amount
            });

            const verifyPayment = await Payment.findByOrderId(orderId);
            console.log('🔍 Verification - payment in DB:', {
                id: verifyPayment?.id,
                order_id: verifyPayment?.order_id,
                user_id: verifyPayment?.user_id,
                userId: verifyPayment?.userId
            });

            // Инициируем платеж в Tinkoff
            const tinkoffService = new TinkoffService();
            const tinkoffResult = await tinkoffService.initPayment(paymentData);

            console.log('✅ Tinkoff payment initiated:', {
                PaymentId: tinkoffResult.PaymentId,
                PaymentURL: tinkoffResult.PaymentURL,
                Success: tinkoffResult.Success
            });

            // Обновляем платеж с PaymentId от Tinkoff
            if (tinkoffResult.PaymentId) {
                await Payment.updateStatus(orderId, 'completed', {
                    tinkoff_payment_id: tinkoffResult.PaymentId
                });
            }

            return {
                success: true,
                paymentId: payment.id,
                paymentUrl: tinkoffResult.PaymentURL,
                orderId: orderId,
                amount: amount,
                tinkoffPaymentId: tinkoffResult.PaymentId
            };

        } catch (error) {
            console.error('❌ Error in purchaseSlots:', error);
            throw error;
        }
    }

    /**
     * Расчет стоимости слотов
     */
    calculateAmount(slotCount) {
        const prices = {
            1: 100000,  // 1000 руб в копейках
            3: 300000,  // 3000 руб
            5: 500000,  // 5000 руб
            15: 1500000 // 15000 руб
        };

        if (!prices[slotCount]) {
            throw new Error(`Некорректное количество слотов: ${slotCount}`);
        }

        return prices[slotCount];
    }

    /**
     * Генерация чека для Tinkoff
     */
    generateReceipt(amount, slotCount, email) {
        return {
            Email: email,
            Taxation: 'osn',
            Items: [
                {
                    Name: `Покупка ${slotCount} слота(ов) участия`,
                    Price: amount,
                    Quantity: 1,
                    Amount: amount,
                    Tax: 'none',
                    PaymentMethod: 'full_payment',
                    PaymentObject: 'service'
                }
            ]
        };
    }

    /**
     * Получение слотов пользователя
     */
    async getUserSlots(userId) {
        try {
            console.log('🔍 Getting user slots for:', userId);

            const slots = await Slot.findByUserIdSlots(userId);

            return {
                success: true,
                slots: slots,
                totalCount: slots.length,
                activeCount: slots.filter(slot => slot.status === 'active').length
            };

        } catch (error) {
            console.error('❌ Error getting user slots:', error);
            throw error;
        }
    }

    /**
     * Создание слотов после успешной оплаты
     */
    async createSlotsAfterPayment(userId, slotCount, orderId) {
        try {
            console.log('🎰 Creating slots after payment:', {
                userId,
                slotCount,
                orderId
            });

            // ПРОВЕРКА
            if (!userId || !slotCount || slotCount <= 0 || !orderId) {
                throw new Error('Неверные параметры для создания слотов');
            }

            // Получаем платеж по OrderId
            const payment = await Payment.findByOrderId(orderId);

            if (!payment) {
                throw new Error(`Платеж не найден для orderId: ${orderId}`);
            }

            console.log('✅ Found payment:', {
                id: payment.id,
                order_id: payment.order_id,
                user_id: payment.user_id,
                amount: payment.amount,
                status: payment.status
            });

            // Проверяем, что платеж принадлежит пользователю
            if (payment.user_id !== userId) {
                throw new Error('Платеж не принадлежит пользователю');
            }

            // 🔥 ПРОВЕРЯЕМ ЕСТЬ ЛИ УЖЕ СЛОТЫ ДЛЯ ЭТОГО ПЛАТЕЖА
            if (payment.status === 'completed') {
                console.warn('⚠️ Payment already completed, checking for existing slots...');

                try {
                    // Получаем все слоты пользователя
                    const userSlots = await Slot.findByUserId(userId);

                    if (userSlots && Array.isArray(userSlots)) {
                        // 🔥 Ищем слоты с этим payment_id
                        const existingSlots = userSlots.filter(slot => {
                            return (slot.payment_id === payment.id) ||
                                (slot.paymentId === payment.id);
                        });

                        if (existingSlots.length > 0) {
                            console.log(`✅ Found ${existingSlots.length} existing slots for this payment`);

                            // 🔥 ОТПРАВЛЯЕМ ПИСЬМО ДАЖЕ ЕСЛИ СЛОТЫ УЖЕ СУЩЕСТВУЮТ
                            try {
                                const user = await User.findById(userId);
                                if (user && user.email) {
                                    const purchaseData = {
                                        amount: payment.amount,
                                        orderId: payment.order_id,
                                        purchaseDate: new Date().toLocaleDateString('ru-RU')
                                    };

                                    await EmailService.sendEmailNotification(user, existingSlots, purchaseData);
                                    console.log('📧 Notification email sent for existing slots');
                                }
                            } catch (emailError) {
                                console.warn('⚠️ Failed to send email for existing slots:', emailError.message);
                            }

                            return {
                                success: true,
                                slots: existingSlots,
                                slotCount: existingSlots.length,
                                payment: payment,
                                alreadyExists: true
                            };
                        }
                    }

                } catch (slotError) {
                    console.warn('⚠️ Error checking existing slots:', slotError.message);
                }
            }

            // Проверяем доступность слотов
            const availableSlots = await Slot.getAvailableSlotsCount();

            if (availableSlots < slotCount) {
                console.warn(`⚠️ Not enough slots available. Available: ${availableSlots}, Requested: ${slotCount}`);

                const actualCount = Math.min(slotCount, availableSlots);

                if (actualCount === 0) {
                    throw new Error('Нет доступных слотов для покупки');
                }

                console.log(`🔄 Creating ${actualCount} slots instead of ${slotCount}`);
                slotCount = actualCount;
            }

            // 🔥 СОЗДАЕМ СЛОТЫ
            console.log(`🛠️ Creating ${slotCount} slots for user ${userId} with payment ${payment.id}`);
            const slots = await Slot.createMultipleSlots(userId, slotCount, payment.id);

            // 🔥 ОБРАБОТКА РЕЗУЛЬТАТА
            let processedSlots = [];
            if (Array.isArray(slots)) {
                processedSlots = slots;
            } else if (slots && typeof slots === 'object') {
                processedSlots = [slots];
            } else {
                console.error('❌ Unexpected slots format:', typeof slots, slots);
                throw new Error('Неверный формат данных слотов');
            }

            console.log(`✅ Successfully created ${processedSlots.length} slots for user ${userId}`);

            // 🔥 ОБНОВЛЯЕМ СТАТУС ПЛАТЕЖА
            await Payment.updateStatus(orderId, 'completed');
            console.log(`✅ Payment ${orderId} marked as completed`);

            // 🔥 🔥 🔥 ВОТ ЗДЕСЬ ВЫЗЫВАЕМ sendEmailNotification 🔥 🔥 🔥
            try {
                const user = await User.findById(userId);

                if (user && user.email) {
                    console.log('📧 Preparing to send email notification...');

                    // Подготавливаем данные для письма
                    const purchaseData = {
                        amount: payment.amount,
                        orderId: payment.order_id,
                        purchaseDate: new Date().toLocaleDateString('ru-RU')
                    };

                    console.log('📝 Purchase data for email:', {
                        orderId: purchaseData.orderId,
                        amount: purchaseData.amount,
                        userEmail: user.email
                    });

                    // 🔥 ВЫЗОВ МЕТОДА sendEmailNotification
                    const emailResult = await EmailService.sendEmailNotification(
                        user,
                        processedSlots,
                        purchaseData
                    );

                    if (emailResult.success) {
                        console.log('✅ Purchase email notification sent successfully');
                        console.log('   To:', user.email);
                        console.log('   Order:', purchaseData.orderId);
                    } else {
                        console.warn('⚠️ Failed to send purchase email notification:', emailResult.error);
                    }
                } else {
                    console.warn('⚠️ Cannot send email notification:', {
                        userFound: !!user,
                        hasEmail: user ? !!user.email : false,
                        email: user ? user.email : 'no user'
                    });
                }
            } catch (emailError) {
                console.error('❌ Error sending email notification:', emailError);
                console.log('⚠️ Slots created, but email notification failed');
            }

            return {
                success: true,
                slots: processedSlots,
                slotCount: processedSlots.length,
                requestedCount: slotCount,
                payment: payment
            };

        } catch (error) {
            console.error('❌ Error creating slots after payment:', error);

            // 🔥 ОБНОВЛЯЕМ СТАТУС ПЛАТЕЖА НА FAILED ПРИ ОШИБКЕ
            try {
                await Payment.updateStatus(orderId, 'failed');
                console.log(`✅ Payment ${orderId} marked as failed due to error`);
            } catch (updateError) {
                console.error('❌ Error updating payment status:', updateError);
            }

            throw error;
        }
    }

    /**
     * Получение статистики по слотам
     */
    async getSlotStatistics(userId) {
        try {
            const slots = await Slot.findByUserIdSlots(userId);
            const activeSlots = slots.filter(slot => slot.status === 'active');

            return {
                totalSlots: slots.length,
                activeSlots: activeSlots.length,
                availableSlots: await Slot.getAvailableSlotsCount()
            };

        } catch (error) {
            console.error('❌ Error getting slot statistics:', error);
            return {
                totalSlots: 0,
                activeSlots: 0,
                availableSlots: 0
            };
        }
    }
}

export default SlotService;