import axios from 'axios';
import { config } from '../config';

/**
 * Thumbtack Integration Adapter
 * Ready to connect Thumbtack messaging webhook & API
 */
export class ThumbtackService {
  /**
   * Send a reply to a Thumbtack customer inquiry
   */
  public static async sendReply(leadId: string, text: string): Promise<any> {
    console.log(`[ThumbtackService] Sending reply to Thumbtack Lead ${leadId}:`, text);
    // Placeholder ready for Thumbtack Partner API credentials
    return { success: true, leadId, text };
  }

  /**
   * Parse inbound Thumbtack webhook payload
   */
  public static parseInboundMessage(payload: any) {
    return {
      leadId: payload?.lead_id || payload?.id,
      customerName: payload?.customer?.name || 'Thumbtack Customer',
      message: payload?.message?.text || '',
      phone: payload?.customer?.phone,
    };
  }
}
