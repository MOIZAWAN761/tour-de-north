// src/modules/panicAlarm/panicAlarm.helper.js

import { Client } from "@googlemaps/google-maps-services-js";

const googleMapsClient = new Client({});

/* ============================================
   GOOGLE MAPS REVERSE GEOCODING
============================================ */
export async function reverseGeocode(latitude, longitude) {
  try {
    const response = await googleMapsClient.reverseGeocode({
      params: {
        latlng: { lat: latitude, lng: longitude },
        key: process.env.GOOGLE_MAPS_API_KEY,
        language: "en",
      },
      timeout: 5000, // 5 seconds timeout
    });

    if (response.data.results && response.data.results.length > 0) {
      // Get formatted address
      const result = response.data.results[0];
      return result.formatted_address;
    }

    return null;
  } catch (error) {
    console.error("Reverse geocoding error:", error.message);
    return null;
  }
}

/* ============================================
   VALIDATE COORDINATES (Mansehra region)
============================================ */
export function validateMansehraCoordinates(latitude, longitude) {
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  // Check if valid numbers
  if (isNaN(lat) || isNaN(lon)) {
    return { valid: false, message: "Invalid coordinates format" };
  }

  // General latitude/longitude ranges
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return { valid: false, message: "Coordinates out of valid range" };
  }

  // Mansehra district bounds (approximate)
  // Latitude: 34.0°N to 35.5°N
  // Longitude: 72.8°E to 73.8°E
  const MANSEHRA_BOUNDS = {
    minLat: 34.0,
    maxLat: 35.5,
    minLng: 72.8,
    maxLng: 73.8,
  };

  if (
    lat < MANSEHRA_BOUNDS.minLat ||
    lat > MANSEHRA_BOUNDS.maxLat ||
    lon < MANSEHRA_BOUNDS.minLng ||
    lon > MANSEHRA_BOUNDS.maxLng
  ) {
    return {
      valid: false,
      message:
        "Location is outside Mansehra region. This service is only available in Mansehra district.",
    };
  }

  return { valid: true };
}

/* ============================================
   CALCULATE DISTANCE (Haversine formula)
============================================ */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance; // in kilometers
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/* ============================================
   FORMAT SOS DATA (for API response)
============================================ */
export function formatSOSData(sos, includeUserDetails = false) {
  if (!sos) return null;

  const formatted = {
    id: sos.id,

    status: sos.status,
    priority: sos.priority,

    sosFor: sos.sos_for,

    location: {
      latitude: parseFloat(sos.latitude),
      longitude: parseFloat(sos.longitude),
      accuracy: sos.location_accuracy
        ? parseFloat(sos.location_accuracy)
        : null,
      address: sos.address_text,
    },

    emergency: {
      type: sos.emergency_type,
      note: sos.quick_note,
      casualties: sos.estimated_casualties,
      userInjured: sos.user_injured_level,
      canReceiveCall: sos.can_receive_call,
    },

    // Other person details (if sos_for = 'other')
    otherPerson:
      sos.sos_for === "other"
        ? {
            name: sos.other_person_name,
            phone: sos.other_person_phone,
            relation: sos.other_person_relation,
          }
        : null,

    timestamps: {
      created: sos.created_at,
      acknowledged: sos.acknowledged_at,
      responded: sos.responded_at,
      resolved: sos.resolved_at,
      cancelled: sos.cancelled_at,
    },

    resolution:
      sos.status === "resolved"
        ? {
            type: sos.resolution_type,
            notes: sos.resolution_notes,
          }
        : null,

    fakeAlarmScore: sos.fake_alarm_score,
    autoFlagged: sos.auto_flagged,
  };

  // User details (for admin)
  if (includeUserDetails) {
    formatted.user = {
      id: sos.user_id,
      name: sos.user_name,
      phone: sos.user_phone,
      email: sos.user_email,
      bloodType: sos.blood_type,
      medicalConditions: sos.medical_conditions,
    };
  }

  // Acknowledged by (admin info)
  if (sos.acknowledged_by) {
    formatted.acknowledgedBy = {
      id: sos.acknowledged_by,
      name: sos.acknowledged_by_name,
      phone: sos.acknowledged_by_phone,
    };
  }

  return formatted;
}

/* ============================================
   FORMAT SOS LIST ITEM (for list views)
============================================ */
export function formatSOSListItem(sos) {
  return {
    id: sos.id,
    status: sos.status,
    priority: sos.priority,
    sosFor: sos.sos_for,

    location: {
      latitude: parseFloat(sos.latitude),
      longitude: parseFloat(sos.longitude),
      address: sos.address_text,
    },

    emergencyType: sos.emergency_type,
    quickNote: sos.quick_note,

    acknowledgedBy: sos.acknowledged_by_name || null,

    createdAt: sos.created_at,
    resolvedAt: sos.resolved_at,
  };
}

/* ============================================
   FORMAT MESSAGE
============================================ */
export function formatMessage(message) {
  return {
    id: message.id,
    sosId: message.sos_id,
    sender: {
      id: message.sender_id,
      type: message.sender_type,
      name: message.sender_name,
    },
    message: message.message,
    isRead: message.is_read,
    readAt: message.read_at,
    createdAt: message.created_at,
  };
}

/* ============================================
   SANITIZE PHONE NUMBER
============================================ */
export function sanitizePhoneNumber(phone) {
  if (!phone) return null;

  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, "");

  // If starts with country code, keep it
  if (cleaned.startsWith("92")) {
    return `+${cleaned}`;
  }

  // If starts with 0, replace with +92
  if (cleaned.startsWith("0")) {
    return `+92${cleaned.substring(1)}`;
  }

  // Otherwise, assume it's Pakistani number without prefix
  return `+92${cleaned}`;
}

/* ============================================
   DETERMINE PRIORITY (based on emergency type)
============================================ */
export function determinePriority(emergencyType, userInjured) {
  if (emergencyType === "fire" || userInjured === "serious") {
    return "critical";
  }

  if (emergencyType === "medical" || emergencyType === "crime") {
    return "high";
  }

  if (emergencyType === "accident") {
    return "high";
  }

  return "high"; // Default for SOS
}

/* ============================================
   CHECK IF MESSAGING ALLOWED
============================================ */
export function isMessagingAllowed(sosStatus) {
  // Messaging allowed only after acknowledgment and before resolution
  return ["acknowledged", "responding"].includes(sosStatus);
}

/* ============================================
   VALIDATE SOS FOR OTHER DATA
============================================ */
export function validateOtherPersonData(data) {
  const errors = [];

  if (!data.otherPersonName || data.otherPersonName.trim().length < 2) {
    errors.push("Other person's name is required (minimum 2 characters)");
  }

  if (!data.otherPersonPhone) {
    errors.push("Other person's phone number is required");
  }

  if (!data.otherPersonRelation || data.otherPersonRelation.trim().length < 2) {
    errors.push("Relation to the person is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/* ============================================
   GET STATUS DISPLAY TEXT
============================================ */
export function getStatusDisplayText(status) {
  const statusMap = {
    created: "SOS Created",
    acknowledged: "Acknowledged by Police",
    responding: "Help is on the way",
    resolved: "Emergency Resolved",
    cancelled: "SOS Cancelled",
  };

  return statusMap[status] || status;
}

/* ============================================
   GET RESOLUTION TYPE DISPLAY TEXT
============================================ */
export function getResolutionTypeDisplayText(type) {
  const typeMap = {
    genuine_emergency: "Emergency Assistance Provided",
    accidental: "Accidental Activation",
    false_alarm: "False Alarm",
    duplicate: "Duplicate SOS",
  };

  return typeMap[type] || type;
}

/* ============================================
   CALCULATE TIME DIFFERENCE (in minutes)
============================================ */
export function calculateTimeDifference(startTime, endTime) {
  if (!startTime || !endTime) return null;

  const start = new Date(startTime);
  const end = new Date(endTime);

  const diffMs = end - start;
  const diffMinutes = Math.floor(diffMs / 60000);

  return diffMinutes;
}

/* ============================================
   FORMAT STATISTICS
============================================ */
export function formatStatistics(stats) {
  return {
    total: parseInt(stats.total) || 0,
    resolved: parseInt(stats.resolved) || 0,
    genuine: parseInt(stats.genuine) || 0,
    fake: parseInt(stats.fake) || 0,
    accidental: parseInt(stats.accidental) || 0,
    averageResponseTime: stats.avg_response_time_minutes
      ? parseFloat(stats.avg_response_time_minutes).toFixed(2)
      : null,
  };
}

















// // src/helpers/panicAlarm.helper.js

// import axios from "axios";

// class PanicAlarmHelper {
//   /* ============================================
//      CHECK IF LOCATION IS WITHIN MANSEHRA BOUNDS
//   ============================================ */
//   static isLocationInMansehra(latitude, longitude) {
//     const MANSEHRA_BOUNDS = {
//       north: 34.8,
//       south: 34.0,
//       east: 73.5,
//       west: 72.8,
//     };

//     return (
//       latitude >= MANSEHRA_BOUNDS.south &&
//       latitude <= MANSEHRA_BOUNDS.north &&
//       longitude >= MANSEHRA_BOUNDS.west &&
//       longitude <= MANSEHRA_BOUNDS.east
//     );
//   }

//   /* ============================================
//      REVERSE GEOCODE USING GOOGLE MAPS API
//   ============================================ */
//   static async reverseGeocode(latitude, longitude) {
//     const lat = parseFloat(latitude);
//     const lon = parseFloat(longitude);

//     if (Number.isNaN(lat) || Number.isNaN(lon)) return null;

//     try {
//       const apiKey = process.env.GOOGLE_MAPS_API_KEY;
//       const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${apiKey}`;

//       const response = await axios.get(url, { timeout: 5000 });

//       if (
//         response?.data?.status === "OK" &&
//         response.data.results &&
//         response.data.results.length > 0
//       ) {
//         return response.data.results[0].formatted_address;
//       }

//       return null;
//     } catch (error) {
//       console.error("Google Maps reverse geocode failed:", error.message);
//       return null;
//     }
//   }

//   /* ============================================
//      CALCULATE FAKE ALARM SCORE
//   ============================================ */
//   static calculateFakeAlarmScore(recentCount, historicalFakeCount) {
//     let score = 0;

//     // Recent frequency check
//     if (recentCount >= 3) score += 0.5;

//     // Historical fake alarms
//     if (historicalFakeCount >= 2) score += 0.4;

//     return Math.min(score, 1.0);
//   }

//   /* ============================================
//      BUILD SOS NOTIFICATION
//   ============================================ */
//   static buildSOSNotification(sosData) {
//     const { sos_id, user_name, address_text, emergency_type } = sosData;

//     let title = `🚨 NEW SOS ALARM — #${sos_id}`;
//     let body = `${user_name} needs help`;

//     if (address_text) body += ` at ${address_text}`;
//     if (emergency_type) body += ` (${emergency_type})`;

//     return { title, body };
//   }

//   /* ============================================
//      BUILD SOS TIMELINE
//   ============================================ */
//   static buildTimeline(sos) {
//     const timeline = [];

//     // Created
//     timeline.push({
//       status: "created",
//       timestamp: sos.created_at,
//       description: `SOS sent from ${sos.address_text || "location"}`,
//     });

//     // Acknowledged
//     if (sos.acknowledged_at) {
//       timeline.push({
//         status: "acknowledged",
//         timestamp: sos.acknowledged_at,
//         description: `Officer ${sos.admin_name} acknowledged`,
//       });
//     }

//     // Responding
//     if (sos.responded_at) {
//       timeline.push({
//         status: "responding",
//         timestamp: sos.responded_at,
//         description: "Officer is on the way",
//       });
//     }

//     // Resolved
//     if (sos.resolved_at) {
//       timeline.push({
//         status: "resolved",
//         timestamp: sos.resolved_at,
//         description: sos.resolution_notes || "SOS resolved",
//       });
//     }

//     return timeline;
//   }
// }

// export default PanicAlarmHelper;
