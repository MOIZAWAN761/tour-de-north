
// src/modules/panicAlarm/public/panicAlarm.public.controller.js

import { PanicAlarmService } from "../panicAlarm.service.js";

export const PanicAlarmPublicController = {
    /* ============================================
       CREATE SOS FOR SELF
    ============================================ */
    async createSOSForSelf(req, res, next) {
        try {
            const userId = req.user.id;
            const ipAddress =
                req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
            const userAgent = req.headers["user-agent"];

            const result = await PanicAlarmService.createSOSForSelf(
                req.body,
                userId,
                ipAddress,
                userAgent,
            );

            return res.status(201).json({
                success: true,
                message: result.message,
                data: {
                    sosId: result.sosId,
                    status: result.status,
                },
            });
        } catch (error) {
            next(error);
        }
    },

    /* ============================================
       CREATE SOS FOR OTHER
    ============================================ */
    async createSOSForOther(req, res, next) {
        try {
            const userId = req.user.id;
            const ipAddress =
                req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
            const userAgent = req.headers["user-agent"];

            const result = await PanicAlarmService.createSOSForOther(
                req.body,
                userId,
                ipAddress,
                userAgent,
            );

            return res.status(201).json({
                success: true,
                message: result.message,
                data: {
                    sosId: result.sosId,
                    status: result.status,
                },
            });
        } catch (error) {
            next(error);
        }
    },

    /* ============================================
       UPDATE SOS CONTEXT
    ============================================ */
    async updateSOSContext(req, res, next) {
        try {
            const { sosId } = req.params;
            const userId = req.user.id;
            const ipAddress =
                req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
            const userAgent = req.headers["user-agent"];

            const sos = await PanicAlarmService.updateSOSContext(
                parseInt(sosId),
                req.body,
                userId,
                ipAddress,
                userAgent,
            );

            return res.status(200).json({
                success: true,
                message: "SOS context updated successfully",
                data: sos,
            });
        } catch (error) {
            next(error);
        }
    },

    /* ============================================
       GET SOS BY ID
    ============================================ */
    async getSOSById(req, res, next) {
        try {
            const { sosId } = req.params;
            const userId = req.user.id;
            const userRole = req.user.role;

            const sos = await PanicAlarmService.getSOSById(
                parseInt(sosId),
                userId,
                userRole,
            );

            return res.status(200).json({
                success: true,
                data: sos,
            });
        } catch (error) {
            next(error);
        }
    },

    /* ============================================
       GET MY SOS LIST
    ============================================ */

    async getMySOSList(req, res, next) {
        try {
            const userId = req.user.id;
            const { status, page = 1, limit = 20 } = req.query;

            const result = await PanicAlarmService.getUserSOSList({
                userId,
                status,
                page: parseInt(page),
                limit: parseInt(limit),
            });

            // ✅ FIX: Return data and pagination at top level
            return res.status(200).json({
                success: true,
                data: result.sos, // ← Array of SOS
                pagination: result.pagination, // ← Pagination object
            });
        } catch (error) {
            next(error);
        }
    },
}