// src/modules/jeeps/jeeps.service.js

import { JeepsModel } from "./jeep.model.js";
import { PlacesModel } from "../../places/place.model.js";
import { JeepAuditLog, JEEP_AUDIT_ACTIONS } from "./jeep.audit.model.js";
import {
  uploadJeepImage,
  deleteJeepImage,
  formatJeepData,
  formatJeepListItem,
  formatDriverData,
  formatDriverListItem,
  validateCNIC,
  validatePhone,
  validateJeepNumber,
  validateCapacity,
  sanitizeDriverData,
  sanitizeJeepData,
} from "./jeep.helper.js";

export const JeepsService = {
  /* ============================================
     DRIVER OPERATIONS
  ============================================ */

  /* Create driver */
  async createDriver(data, userId, ipAddress, userAgent) {
    // Sanitize and validate data
    const sanitized = sanitizeDriverData(data);

    // Validate CNIC
    const cnicValidation = validateCNIC(sanitized.cnic);
    if (!cnicValidation.valid) {
      throw { status: 400, message: cnicValidation.message };
    }

    // Validate phone
    const phoneValidation = validatePhone(sanitized.phone);
    if (!phoneValidation.valid) {
      throw { status: 400, message: phoneValidation.message };
    }

    // Check if driver already exists
    const existingDriver = await JeepsModel.checkDriverExistsByCNIC(
      cnicValidation.formatted,
    );

    if (existingDriver) {
      throw {
        status: 409,
        message: "A driver with this CNIC already exists",
        existingDriver: {
          id: existingDriver.id,
          fullName: existingDriver.full_name,
          cnic: existingDriver.cnic,
        },
      };
    }

    // Create driver
    const driverData = {
      fullName: sanitized.fullName,
      cnic: cnicValidation.formatted,
      phone: phoneValidation.formatted,
      address: sanitized.address,
    };

    const driver = await JeepsModel.createDriver(driverData, userId);

    // Log audit
    await JeepAuditLog.logAction({
      driverId: driver.id,
      userId,
      action: JEEP_AUDIT_ACTIONS.DRIVER_CREATED,
      changes: {
        driverName: driver.full_name,
        cnic: driver.cnic,
      },
      ipAddress,
      userAgent,
    });

    return formatDriverData(driver);
  },

  /* Get driver by ID */
  async getDriverById(driverId, includeJeeps = false) {
    const driver = await JeepsModel.getDriverById(driverId, includeJeeps);

    if (!driver) {
      throw { status: 404, message: "Driver not found" };
    }

    return formatDriverData(driver, includeJeeps);
  },

  /* Get all drivers */
  async getAllDrivers({
    search = "",
    sortBy = "created_at",
    order = "desc",
    page = 1,
    limit = 20,
  }) {
    const offset = (page - 1) * limit;

    const drivers = await JeepsModel.getAllDrivers({
      search,
      sortBy,
      order,
      limit,
      offset,
    });

    const total = await JeepsModel.countDrivers({ search });

    return {
      drivers: drivers.map(formatDriverListItem),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /* Update driver */
  async updateDriver(driverId, data, userId, ipAddress, userAgent) {
    // Check if driver exists
    const existingDriver = await JeepsModel.getDriverById(driverId);
    if (!existingDriver) {
      throw { status: 404, message: "Driver not found" };
    }

    // Sanitize data
    const sanitized = sanitizeDriverData(data);

    // Validate CNIC if provided
    if (sanitized.cnic) {
      const cnicValidation = validateCNIC(sanitized.cnic);
      if (!cnicValidation.valid) {
        throw { status: 400, message: cnicValidation.message };
      }
      sanitized.cnic = cnicValidation.formatted;

      // Check if CNIC is already used by another driver
      if (sanitized.cnic !== existingDriver.cnic) {
        const driverWithCNIC = await JeepsModel.checkDriverExistsByCNIC(
          sanitized.cnic,
        );
        if (driverWithCNIC && driverWithCNIC.id !== driverId) {
          throw {
            status: 409,
            message: "This CNIC is already registered to another driver",
          };
        }
      }
    }

    // Validate phone if provided
    if (sanitized.phone) {
      const phoneValidation = validatePhone(sanitized.phone);
      if (!phoneValidation.valid) {
        throw { status: 400, message: phoneValidation.message };
      }
      sanitized.phone = phoneValidation.formatted;
    }

    // Track changes for audit
    const changes = {};
    Object.keys(sanitized).forEach((key) => {
      const oldKey = key === "fullName" ? "full_name" : key;
      if (
        sanitized[key] !== undefined &&
        sanitized[key] !== existingDriver[oldKey]
      ) {
        changes[key] = { from: existingDriver[oldKey], to: sanitized[key] };
      }
    });

    // Update driver
    const updatedDriver = await JeepsModel.updateDriver(
      driverId,
      sanitized,
      userId,
    );

    // Log audit
    await JeepAuditLog.logAction({
      driverId,
      userId,
      action: JEEP_AUDIT_ACTIONS.DRIVER_UPDATED,
      changes,
      ipAddress,
      userAgent,
    });

    return formatDriverData(updatedDriver);
  },

  /* Update driver active status */
  async updateDriverActiveStatus(driverId, isActive, userId, ipAddress, userAgent) {
    const existingDriver = await JeepsModel.getDriverById(driverId);
    if (!existingDriver) {
      throw { status: 404, message: "Driver not found" };
    }

    const updatedDriver = await JeepsModel.updateDriverActiveStatus(
      driverId,
      isActive,
      userId,
    );

    // Log audit
    await JeepAuditLog.logAction({
      driverId,
      userId,
      action: JEEP_AUDIT_ACTIONS.DRIVER_ACTIVE_STATUS_UPDATED,
      changes: {
        from: existingDriver.is_active,
        to: isActive,
      },
      ipAddress,
      userAgent,
    });

    return formatDriverData(updatedDriver);
  },

  /* Delete driver */
  async deleteDriver(driverId, userId, ipAddress, userAgent) {
    const driver = await JeepsModel.getDriverById(driverId);
    if (!driver) {
      throw { status: 404, message: "Driver not found" };
    }

    // Check if driver has any jeeps
    const hasJeeps = await JeepsModel.checkDriverHasJeeps(driverId);
    if (hasJeeps) {
      throw {
        status: 400,
        message:
          "Cannot delete driver. Driver is assigned to one or more jeeps. Please reassign or delete those jeeps first.",
      };
    }

    // Log audit before deletion
    await JeepAuditLog.logAction({
      driverId,
      userId,
      action: JEEP_AUDIT_ACTIONS.DRIVER_DELETED,
      changes: {
        driverName: driver.full_name,
        cnic: driver.cnic,
      },
      ipAddress,
      userAgent,
    });

    // Delete driver
    await JeepsModel.deleteDriver(driverId);

    return { message: "Driver deleted successfully" };
  },

  /* Get driver audit history */
  async getDriverAuditHistory(driverId, limit = 50) {
    const driver = await JeepsModel.getDriverById(driverId);
    if (!driver) {
      throw { status: 404, message: "Driver not found" };
    }

    const history = await JeepAuditLog.getDriverHistory(driverId, limit);
    return history;
  },

  /* ============================================
     JEEP OPERATIONS
  ============================================ */

  /* Create jeep with new driver */
  async createJeep(jeepData, driverData, imageFile, userId, ipAddress, userAgent) {
    // Sanitize jeep data
    const sanitizedJeep = sanitizeJeepData(jeepData);

    // Validate jeep number
    const jeepNumberValidation = validateJeepNumber(sanitizedJeep.jeepNumber);
    if (!jeepNumberValidation.valid) {
      throw { status: 400, message: jeepNumberValidation.message };
    }
    sanitizedJeep.jeepNumber = jeepNumberValidation.formatted;

    // Validate capacity
    const capacityValidation = validateCapacity(sanitizedJeep.capacity);
    if (!capacityValidation.valid) {
      throw { status: 400, message: capacityValidation.message };
    }
    sanitizedJeep.capacity = capacityValidation.value;

    // Check if jeep already exists
    const existingJeep = await JeepsModel.checkJeepExistsByNumber(
      sanitizedJeep.jeepNumber,
    );

    if (existingJeep) {
      throw {
        status: 409,
        message: "A jeep with this number already exists",
        existingJeep: {
          id: existingJeep.id,
          name: existingJeep.name,
          jeepNumber: existingJeep.jeep_number,
        },
      };
    }

    // Handle driver - check if exists by CNIC
    const sanitizedDriver = sanitizeDriverData(driverData);

    // Validate driver CNIC
    const cnicValidation = validateCNIC(sanitizedDriver.cnic);
    if (!cnicValidation.valid) {
      throw { status: 400, message: cnicValidation.message };
    }

    let driver = await JeepsModel.checkDriverExistsByCNIC(
      cnicValidation.formatted,
    );

    if (driver) {
      // Driver exists - check if active
      if (!driver.is_active) {
        throw {
          status: 400,
          message: `Driver with CNIC ${cnicValidation.formatted} exists but is inactive. Please activate the driver first.`,
        };
      }
    } else {
      // Create new driver
      const phoneValidation = validatePhone(sanitizedDriver.phone);
      if (!phoneValidation.valid) {
        throw { status: 400, message: phoneValidation.message };
      }

      const newDriverData = {
        fullName: sanitizedDriver.fullName,
        cnic: cnicValidation.formatted,
        phone: phoneValidation.formatted,
        address: sanitizedDriver.address,
      };

      driver = await JeepsModel.createDriver(newDriverData, userId);

      // Log driver creation
      await JeepAuditLog.logAction({
        driverId: driver.id,
        userId,
        action: JEEP_AUDIT_ACTIONS.DRIVER_CREATED,
        changes: {
          driverName: driver.full_name,
          cnic: driver.cnic,
          createdWith: "jeep",
        },
        ipAddress,
        userAgent,
      });
    }

    // Upload image
    if (!imageFile) {
      throw { status: 400, message: "Jeep image is required" };
    }

    const uploadedImage = await uploadJeepImage(imageFile);

    // Create jeep
    const finalJeepData = {
      name: sanitizedJeep.name,
      description: sanitizedJeep.description,
      region: sanitizedJeep.region,
      jeepNumber: sanitizedJeep.jeepNumber,
      vehicleType: sanitizedJeep.vehicleType,
      capacity: sanitizedJeep.capacity,
      driverId: driver.id,
      mainImageUrl: uploadedImage.url,
      mainImagePublicId: uploadedImage.publicId,
      isAvailable: sanitizedJeep.isAvailable,
    };

    const jeep = await JeepsModel.createJeep(finalJeepData, userId);

    // Log jeep creation
    await JeepAuditLog.logAction({
      jeepId: jeep.id,
      userId,
      action: JEEP_AUDIT_ACTIONS.JEEP_CREATED,
      changes: {
        jeepName: jeep.name,
        jeepNumber: jeep.jeep_number,
        region: jeep.region,
        driverId: driver.id,
        driverName: driver.full_name,
      },
      ipAddress,
      userAgent,
    });

    // Fetch full jeep data with driver info
    const fullJeep = await JeepsModel.getJeepById(jeep.id);
    return formatJeepData(fullJeep, true);
  },

  /* Create jeep with existing driver */
  async createJeepWithExistingDriver(jeepData, imageFile, userId, ipAddress, userAgent) {
    // Sanitize jeep data
    const sanitized = sanitizeJeepData(jeepData);

    // Validate jeep number
    const jeepNumberValidation = validateJeepNumber(sanitized.jeepNumber);
    if (!jeepNumberValidation.valid) {
      throw { status: 400, message: jeepNumberValidation.message };
    }
    sanitized.jeepNumber = jeepNumberValidation.formatted;

    // Validate capacity
    const capacityValidation = validateCapacity(sanitized.capacity);
    if (!capacityValidation.valid) {
      throw { status: 400, message: capacityValidation.message };
    }
    sanitized.capacity = capacityValidation.value;

    // Check if jeep already exists
    const existingJeep = await JeepsModel.checkJeepExistsByNumber(
      sanitized.jeepNumber,
    );

    if (existingJeep) {
      throw {
        status: 409,
        message: "A jeep with this number already exists",
        existingJeep: {
          id: existingJeep.id,
          name: existingJeep.name,
          jeepNumber: existingJeep.jeep_number,
        },
      };
    }

    // Verify driver exists
    const driver = await JeepsModel.getDriverById(sanitized.driverId);
    if (!driver) {
      throw { status: 404, message: "Driver not found" };
    }

    if (!driver.is_active) {
      throw {
        status: 400,
        message: "Cannot assign inactive driver to jeep",
      };
    }

    // Upload image
    if (!imageFile) {
      throw { status: 400, message: "Jeep image is required" };
    }

    const uploadedImage = await uploadJeepImage(imageFile);

    // Create jeep
    const finalJeepData = {
      name: sanitized.name,
      description: sanitized.description,
      region: sanitized.region,
      jeepNumber: sanitized.jeepNumber,
      vehicleType: sanitized.vehicleType,
      capacity: sanitized.capacity,
      driverId: sanitized.driverId,
      mainImageUrl: uploadedImage.url,
      mainImagePublicId: uploadedImage.publicId,
      isAvailable: sanitized.isAvailable,
    };

    const jeep = await JeepsModel.createJeep(finalJeepData, userId);

    // Log jeep creation
    await JeepAuditLog.logAction({
      jeepId: jeep.id,
      userId,
      action: JEEP_AUDIT_ACTIONS.JEEP_CREATED,
      changes: {
        jeepName: jeep.name,
        jeepNumber: jeep.jeep_number,
        region: jeep.region,
        driverId: driver.id,
        driverName: driver.full_name,
      },
      ipAddress,
      userAgent,
    });

    // Fetch full jeep data with driver info
    const fullJeep = await JeepsModel.getJeepById(jeep.id);
    return formatJeepData(fullJeep, true);
  },

  /* Get jeep by ID */
  async getJeepById(jeepId, userId, incrementView = false) {
    const jeep = await JeepsModel.getJeepById(jeepId, userId);

    if (!jeep) {
      throw { status: 404, message: "Jeep not found" };
    }

    // Increment view count if requested
    if (incrementView) {
      await JeepsModel.incrementViewCount(jeepId);
      jeep.view_count++;
    }

    return formatJeepData(jeep, true);
  },

  /* Get all jeeps */
  async getAllJeeps({
    search = "",
    region,
    isAvailable,
    isActive,
    sortBy = "created_at",
    order = "desc",
    page = 1,
    limit = 20,
    userId,
  }) {
    const offset = (page - 1) * limit;

    const jeeps = await JeepsModel.getAllJeeps({
      search,
      region,
      isAvailable,
      isActive,
      sortBy,
      order,
      limit,
      offset,
      userId,
    });

    const total = await JeepsModel.countJeeps({
      search,
      region,
      isAvailable,
      isActive,
    });

    return {
      jeeps: jeeps.map(formatJeepListItem),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /* Get jeeps by region (for places) */
  async getJeepsByRegion(region, userId) {
    const jeeps = await JeepsModel.getJeepsByRegion(region, userId);
    return jeeps.map(formatJeepListItem);
  },

  /* Get trending jeeps */
  async getTrendingJeeps(limit = 10, userId) {
    const jeeps = await JeepsModel.getTrendingJeeps(limit, userId);
    return jeeps.map(formatJeepListItem);
  },

  /* Update jeep */
  async updateJeep(jeepId, data, imageFile, userId, ipAddress, userAgent) {
    // Check if jeep exists
    const existingJeep = await JeepsModel.getJeepById(jeepId);
    if (!existingJeep) {
      throw { status: 404, message: "Jeep not found" };
    }

    // Sanitize data
    const sanitized = sanitizeJeepData(data);

    // Validate jeep number if changed
    if (sanitized.jeepNumber) {
      const jeepNumberValidation = validateJeepNumber(sanitized.jeepNumber);
      if (!jeepNumberValidation.valid) {
        throw { status: 400, message: jeepNumberValidation.message };
      }
      sanitized.jeepNumber = jeepNumberValidation.formatted;

      // Check if jeep number is already used by another jeep
      if (sanitized.jeepNumber !== existingJeep.jeep_number) {
        const jeepWithNumber = await JeepsModel.checkJeepExistsByNumber(
          sanitized.jeepNumber,
        );
        if (jeepWithNumber && jeepWithNumber.id !== jeepId) {
          throw {
            status: 409,
            message: "This jeep number is already registered to another jeep",
          };
        }
      }
    }

    // Validate capacity if provided
    if (sanitized.capacity) {
      const capacityValidation = validateCapacity(sanitized.capacity);
      if (!capacityValidation.valid) {
        throw { status: 400, message: capacityValidation.message };
      }
      sanitized.capacity = capacityValidation.value;
    }

    const updateData = { ...sanitized };

    // Handle image update
    if (imageFile) {
      // Delete old image from Cloudinary
      if (existingJeep.main_image_public_id) {
        await deleteJeepImage(existingJeep.main_image_public_id);
      }

      // Upload new image
      const uploadedImage = await uploadJeepImage(imageFile);
      updateData.mainImageUrl = uploadedImage.url;
      updateData.mainImagePublicId = uploadedImage.publicId;
    }

    // Track changes for audit
    const changes = {};
    Object.keys(sanitized).forEach((key) => {
      const oldKey =
        key === "jeepNumber"
          ? "jeep_number"
          : key === "vehicleType"
            ? "vehicle_type"
            : key === "isAvailable"
              ? "is_available"
              : key === "isActive"
                ? "is_active"
                : key;

      if (
        sanitized[key] !== undefined &&
        sanitized[key] !== existingJeep[oldKey]
      ) {
        changes[key] = { from: existingJeep[oldKey], to: sanitized[key] };
      }
    });

    // Update jeep
    const updatedJeep = await JeepsModel.updateJeep(jeepId, updateData, userId);

    // Log audit
    await JeepAuditLog.logAction({
      jeepId,
      userId,
      action: JEEP_AUDIT_ACTIONS.JEEP_UPDATED,
      changes,
      ipAddress,
      userAgent,
    });

    // Fetch full data
    const fullJeep = await JeepsModel.getJeepById(jeepId);
    return formatJeepData(fullJeep, true);
  },

  /* Update jeep availability */
  async updateAvailability(jeepId, isAvailable, userId, ipAddress, userAgent) {
    const existingJeep = await JeepsModel.getJeepById(jeepId);
    if (!existingJeep) {
      throw { status: 404, message: "Jeep not found" };
    }

    const updatedJeep = await JeepsModel.updateAvailability(
      jeepId,
      isAvailable,
      userId,
    );

    // Log audit
    await JeepAuditLog.logAction({
      jeepId,
      userId,
      action: JEEP_AUDIT_ACTIONS.JEEP_AVAILABILITY_UPDATED,
      changes: {
        from: existingJeep.is_available,
        to: isAvailable,
      },
      ipAddress,
      userAgent,
    });

    return formatJeepData(updatedJeep);
  },

  /* Update jeep active status */
  async updateActiveStatus(jeepId, isActive, userId, ipAddress, userAgent) {
    const existingJeep = await JeepsModel.getJeepById(jeepId);
    if (!existingJeep) {
      throw { status: 404, message: "Jeep not found" };
    }

    const updatedJeep = await JeepsModel.updateActiveStatus(
      jeepId,
      isActive,
      userId,
    );

    // Log audit
    await JeepAuditLog.logAction({
      jeepId,
      userId,
      action: JEEP_AUDIT_ACTIONS.JEEP_ACTIVE_STATUS_UPDATED,
      changes: {
        from: existingJeep.is_active,
        to: isActive,
      },
      ipAddress,
      userAgent,
    });

    return formatJeepData(updatedJeep);
  },

  /* Delete jeep */
  async deleteJeep(jeepId, userId, ipAddress, userAgent) {
    const jeep = await JeepsModel.getJeepById(jeepId);
    if (!jeep) {
      throw { status: 404, message: "Jeep not found" };
    }

    // Log audit before deletion
    await JeepAuditLog.logAction({
      jeepId,
      userId,
      action: JEEP_AUDIT_ACTIONS.JEEP_DELETED,
      changes: {
        jeepName: jeep.name,
        jeepNumber: jeep.jeep_number,
        region: jeep.region,
        driverId: jeep.driver_id,
      },
      ipAddress,
      userAgent,
    });

    // Delete image from Cloudinary
    if (jeep.main_image_public_id) {
      await deleteJeepImage(jeep.main_image_public_id);
    }

    // Delete jeep (CASCADE will delete saved records)
    await JeepsModel.deleteJeep(jeepId);

    return { message: "Jeep deleted successfully" };
  },

  /* ============================================
     SAVED JEEPS OPERATIONS
  ============================================ */

  /* Save jeep */
  async saveJeep(userId, jeepId) {
    // Check if jeep exists
    const jeep = await JeepsModel.getJeepById(jeepId);
    if (!jeep) {
      throw { status: 404, message: "Jeep not found" };
    }

    const saved = await JeepsModel.saveJeep(userId, jeepId);

    if (!saved) {
      return {
        message: "Jeep already saved",
        alreadySaved: true,
      };
    }

    return {
      message: "Jeep saved successfully",
      alreadySaved: false,
    };
  },

  /* Unsave jeep */
  async unsaveJeep(userId, jeepId) {
    const unsaved = await JeepsModel.unsaveJeep(userId, jeepId);

    if (!unsaved) {
      throw { status: 404, message: "Jeep was not in your saved list" };
    }

    return {
      message: "Jeep removed from saved list",
    };
  },

  /* Get saved jeeps */
  async getSavedJeeps(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const jeeps = await JeepsModel.getSavedJeeps(userId, limit, offset);
    const total = await JeepsModel.countSavedJeeps(userId);

    return {
      jeeps: jeeps.map(formatJeepListItem),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /* ============================================
     AUDIT HISTORY
  ============================================ */

  /* Get jeep audit history */
  async getJeepAuditHistory(jeepId, limit = 50) {
    const jeep = await JeepsModel.getJeepById(jeepId);
    if (!jeep) {
      throw { status: 404, message: "Jeep not found" };
    }

    const history = await JeepAuditLog.getJeepHistory(jeepId, limit);
    return history;
  },
};