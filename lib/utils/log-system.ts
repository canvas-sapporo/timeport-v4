import { createClientAdminClient } from '@/lib/supabase';
import { LogLevel, SystemLog, AuditLog, LogSettingKey } from '@/schemas/database/log';

// ログ設定値の型定義
type LogSettingValue = string | number | boolean | string[];

// ================================
// ログバッファクラス
// ================================

class LogBuffer {
  private systemLogs: Partial<SystemLog>[] = [];
  private auditLogs: Partial<AuditLog>[] = [];
  private timer: NodeJS.Timeout | null = null;
  private settings: Record<string, LogSettingValue> = {};
  private settingsLoaded = false;

  constructor() {
    this.loadSettings();
  }

  /**
   * 設定を読み込み
   */
  private async loadSettings() {
    try {
      const supabase = createClientAdminClient();
      const { data } = await supabase.from('log_settings').select('setting_key, setting_value');

      if (data) {
        this.settings = data.reduce(
          (acc, setting) => {
            acc[setting.setting_key] = setting.setting_value;
            return acc;
          },
          {} as Record<string, LogSettingValue>
        );
      }
      this.settingsLoaded = true;
    } catch (error) {
      console.error('Failed to load log settings:', error);
      // デフォルト設定を使用
      this.settings = {
        system_log_level: ['info', 'warn', 'error', 'fatal'],
        system_log_enabled: true,
        audit_log_enabled: true,
        buffer_size: 100,
        flush_interval: 5,
        error_log_immediate: true,
      };
      this.settingsLoaded = true;
    }
  }

  /**
   * 設定を取得
   */
  private getSetting<T extends LogSettingValue>(key: LogSettingKey, defaultValue: T): T {
    return (this.settings[key] as T) ?? defaultValue;
  }

  /**
   * システムログを追加
   */
  async addSystemLog(log: Partial<SystemLog>) {
    if (!this.getSetting('system_log_enabled', true)) {
      return;
    }

    const allowedLevels = this.getSetting('system_log_level', ['info', 'warn', 'error', 'fatal']);
    if (!log.level || !allowedLevels.includes(log.level)) {
      return;
    }

    // エラーログの即座書き込み
    if (
      this.getSetting('error_log_immediate', true) &&
      (log.level === 'error' || log.level === 'fatal')
    ) {
      await this.flushSystemLogs([log]);
      return;
    }

    this.systemLogs.push(log);
    await this.checkFlush();
  }

  /**
   * 監査ログを追加
   */
  async addAuditLog(log: Partial<AuditLog>) {
    if (!this.getSetting('audit_log_enabled', true)) {
      return;
    }

    this.auditLogs.push(log);
    await this.checkFlush();
  }

  /**
   * フラッシュ判定
   */
  private async checkFlush() {
    const bufferSize = this.getSetting('buffer_size', 100);
    const flushInterval = this.getSetting('flush_interval', 5) * 1000;

    // バッファサイズチェック
    if (this.systemLogs.length >= bufferSize || this.auditLogs.length >= bufferSize) {
      await this.flush();
      return;
    }

    // タイマーチェック
    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.flush();
      }, flushInterval);
    }
  }

  /**
   * フラッシュ実行
   */
  private async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const systemLogsToFlush = [...this.systemLogs];
    const auditLogsToFlush = [...this.auditLogs];

    this.systemLogs = [];
    this.auditLogs = [];

    // 並行してフラッシュ
    await Promise.allSettled([
      this.flushSystemLogs(systemLogsToFlush),
      this.flushAuditLogs(auditLogsToFlush),
    ]);
  }

  /**
   * システムログフラッシュ
   */
  private async flushSystemLogs(logs: Partial<SystemLog>[]) {
    if (logs.length === 0) return;

    // クライアントサイドではシステムログを記録しない
    if (typeof window !== 'undefined') {
      console.log('クライアントサイドではシステムログを記録しません:', logs.length, '件');
      return;
    }

    try {
      const supabase = createClientAdminClient();
      const { error } = await supabase.from('system_logs').insert(logs);

      if (error) {
        console.error('Failed to flush system logs:', error);
      }
    } catch (error) {
      console.error('Failed to flush system logs:', error);
    }
  }

  /**
   * 監査ログフラッシュ
   */
  private async flushAuditLogs(logs: Partial<AuditLog>[]) {
    if (logs.length === 0) return;

    // クライアントサイドでは監査ログを記録しない
    if (typeof window !== 'undefined') {
      console.log('クライアントサイドでは監査ログを記録しません:', logs.length, '件');
      return;
    }

    try {
      const supabase = createClientAdminClient();
      const { error } = await supabase.from('audit_logs').insert(logs);

      if (error) {
        console.error('Failed to flush audit logs:', error);
      }
    } catch (error) {
      console.error('Failed to flush audit logs:', error);
    }
  }

  /**
   * 強制フラッシュ
   */
  async forceFlush() {
    await this.flush();
  }

  /**
   * 設定を再読み込み
   */
  async reloadSettings() {
    this.settingsLoaded = false;
    await this.loadSettings();
  }
}

// ================================
// グローバルインスタンス
// ================================

let logBuffer: LogBuffer | null = null;

function getLogBuffer(): LogBuffer {
  if (!logBuffer) {
    logBuffer = new LogBuffer();
  }
  return logBuffer;
}

// ================================
// パブリックAPI
// ================================

/**
 * システムログを記録
 */
export async function logSystem(level: LogLevel, message: string, data: Partial<SystemLog> = {}) {
  const buffer = getLogBuffer();

  // 自動的に追加情報を設定
  const enhancedData: Partial<SystemLog> = {
    // 基本情報
    level,
    ...data,

    // 環境情報
    environment: process.env.NODE_ENV || 'development',
    app_version: process.env.npm_package_version || '1.0.0',

    // パフォーマンス情報
    memory_usage_mb: getMemoryUsage(),

    // トレーシング情報
    trace_id: data.trace_id || generateTraceId(),
    request_id: data.request_id || generateTraceId(),

    // タイムスタンプ情報
    created_date: new Date().toISOString().split('T')[0],

    // メタデータ
    metadata: {
      message,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  await buffer.addSystemLog(enhancedData);
}

/**
 * 監査ログを記録
 */
export async function logAudit(action: string, data: Partial<AuditLog> = {}) {
  const buffer = getLogBuffer();

  const log: Partial<AuditLog> = {
    action,
    ...data,
  };

  await buffer.addAuditLog(log);
}

/**
 * デバッグログ
 */
export async function logDebug(message: string, data: Partial<SystemLog> = {}) {
  await logSystem('debug', message, data);
}

/**
 * 情報ログ
 */
export async function logInfo(message: string, data: Partial<SystemLog> = {}) {
  await logSystem('info', message, data);
}

/**
 * 警告ログ
 */
export async function logWarn(message: string, data: Partial<SystemLog> = {}) {
  await logSystem('warn', message, data);
}

/**
 * エラーログ
 */
export async function logError(message: string, error?: Error, data: Partial<SystemLog> = {}) {
  await logSystem('error', message, {
    ...data,
    error_message: error?.message,
    error_stack: error?.stack,
  });
}

/**
 * 致命的エラーログ
 */
export async function logFatal(message: string, error?: Error, data: Partial<SystemLog> = {}) {
  await logSystem('fatal', message, {
    ...data,
    error_message: error?.message,
    error_stack: error?.stack,
  });
}

/**
 * 強制フラッシュ
 */
export async function flushLogs() {
  const buffer = getLogBuffer();
  await buffer.forceFlush();
}

/**
 * 設定再読み込み
 */
export async function reloadLogSettings() {
  const buffer = getLogBuffer();
  await buffer.reloadSettings();
}

/**
 * メモリ使用量を取得
 */
export function getMemoryUsage(): number {
  const memUsage = process.memoryUsage();
  return Math.round(memUsage.heapUsed / 1024 / 1024);
}

/**
 * トレースIDを生成
 */
export function generateTraceId(): string {
  return crypto.randomUUID();
}
