// src/modules/jeeps/jeeps.police.controller.js

import { JeepsService } from "../jeep.service.js";

export const JeepsPoliceController = {
  /* ============================================
     DRIVER OPERATIONS
  ============================================ */

  /* Create driver */
  async createDriver(req, res, next) {
    try {
      const result = await JeepsService.createDriver(
        req.body,
        req.user.id,
        req.ip,
        req.get("user-agent"),
      );

      res.status(201).json({
        success: true,
        message: "Driver created successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /* Get driver by ID */
  async getDriverById(req, res, next) {
    try {
      const { driverId } = req.params;
      const includeJeeps = req.query.includeJeeps === "true";

      const result = await JeepsService.getDriverById(
        parseInt(driverId),
        includeJeeps,
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /* Get all drivers */
  async getAllDrivers(req, res, next) {
    try {
      const { search, sortBy, order, page, limit } = req.query;

      const result = await JeepsService.getAllDrivers({
        search,
        sortBy,
        order,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
      });

      res.status(200).json({
        success: true,
        data: result.drivers,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  },

  /* Update driver */
  async updateDriver(req, res, next) {
    try {
      const { driverId } = req.params;

      const result = await JeepsService.updateDriver(
        parseInt(driverId),
        req.body,
        req.user.id,
        req.ip,
        req.get("user-agent"),
      );

      res.status(200).json({
        success: true,
        message: "Driver updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /* Update driver active status */
  async updateDriverActiveStatus(req, res, next) {
    try {
      const { driverId } = req.params;
      const { isActive } = req.body;

      const result = await JeepsService.updateDriverActiveStatus(
        parseInt(driverId),
        isActive,
        req.user.id,
        req.ip,
        req.get("user-agent"),
      );

      res.status(200).json({
        success: true,
        message: `Driver ${isActive ? "activated" : "deactivated"} successfully`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /* Delete driver */
  async deleteDriver(req, res, next) {
    try {
      const { driverId } = req.params;

      const result = await JeepsService.deleteDriver(
        parseInt(driverId),
        req.user.id,
        req.ip,
        req.get("user-agent"),
      );

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  },

  /* Get driver audit history */
  async getDriverAuditHistory(req, res, next) {
    try {
      const { driverId } = req.params;
      const { limit } = req.query;

      const result = await JeepsService.getDriverAuditHistory(
        parseInt(driverId),
        limit ? parseInt(limit) : 50,
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     JEEP OPERATIONS
  ============================================ */

  /* Create jeep with new driver */
  async createJeep(req, res, next) {
    try {
      // const { jeep, driver } = req.body;
      const jeep = {
        name: req.body.name,
        region: req.body.region,
        jeepNumber: req.body.jeepNumber,
        capacity: req.body.capacity,
        description: req.body.description,
        vehicleType: req.body.vehicleType,
      };

      const driver = req.body.driver;
      const imageFile = req.file?.buffer;

      const result = await JeepsService.createJeep(
        jeep,
        driver,
        imageFile,
        req.user.id,
        req.ip,
        req.get("user-agent"),
      );

      res.status(201).json({
        success: true,
        message: "Jeep created successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /* Create jeep with existing driver */
  async createJeepWithExistingDriver(req, res, next) {
    try {
      const imageFile = req.file?.buffer;

      const result = await JeepsService.createJeepWithExistingDriver(
        req.body,
        imageFile,
        req.user.id,
        req.ip,
        req.get("user-agent"),
      );

      res.status(201).json({
        success: true,
        message: "Jeep created successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /* Get jeep by ID */
  async getJeepById(req, res, next) {
    try {
      const { jeepId } = req.params;

      const result = await JeepsService.getJeepById(
        parseInt(jeepId),
        req.user?.id,
        false,
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /* Get all jeeps */
  async getAllJeeps(req, res, next) {
    try {
      const {
        search,
        region,
        isAvailable,
        isActive,
        sortBy,
        order,
        page,
        limit,
      } = req.query;

      const result = await JeepsService.getAllJeeps({
        search,
        region,
        isAvailable:
          isAvailable !== undefined ? isAvailable === "true" : undefined,
        isActive: isActive !== undefined ? isActive === "true" : undefined,
        sortBy,
        order,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        userId: req.user?.id,
      });

      res.status(200).json({
        success: true,
        data: result.jeeps,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  },

  /* Update jeep */
  async updateJeep(req, res, next) {
    try {
      const { jeepId } = req.params;
      const imageFile = req.file?.buffer;

      const result = await JeepsService.updateJeep(
        parseInt(jeepId),
        req.body,
        imageFile,
        req.user.id,
        req.ip,
        req.get("user-agent"),
      );

      res.status(200).json({
        success: true,
        message: "Jeep updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /* Update jeep availability */
  async updateAvailability(req, res, next) {
    try {
      const { jeepId } = req.params;
      const { isAvailable } = req.body;

      const result = await JeepsService.updateAvailability(
        parseInt(jeepId),
        isAvailable,
        req.user.id,
        req.ip,
        req.get("user-agent"),
      );

      res.status(200).json({
        success: true,
        message: `Jeep marked as ${isAvailable ? "available" : "unavailable"}`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /* Update jeep active status */
  async updateActiveStatus(req, res, next) {
    try {
      const { jeepId } = req.params;
      const { isActive } = req.body;

      const result = await JeepsService.updateActiveStatus(
        parseInt(jeepId),
        isActive,
        req.user.id,
        req.ip,
        req.get("user-agent"),
      );

      res.status(200).json({
        success: true,
        message: `Jeep ${isActive ? "activated" : "deactivated"} successfully`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /* Delete jeep */
  async deleteJeep(req, res, next) {
    try {
      const { jeepId } = req.params;

      const result = await JeepsService.deleteJeep(
        parseInt(jeepId),
        req.user.id,
        req.ip,
        req.get("user-agent"),
      );

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  },

  /* Get jeep audit history */
  async getJeepAuditHistory(req, res, next) {
    try {
      const { jeepId } = req.params;
      const { limit } = req.query;

      const result = await JeepsService.getJeepAuditHistory(
        parseInt(jeepId),
        limit ? parseInt(limit) : 50,
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};
