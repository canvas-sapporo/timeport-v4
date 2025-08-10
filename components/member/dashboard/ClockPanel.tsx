'use client';

import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import TimeDisplay from '@/components/ui/time-display';
import { Clock, LogIn, LogOut, Coffee, Loader2 } from 'lucide-react';

type LoadingAction = 'clockIn' | 'clockOut' | 'startBreak' | 'endBreak' | null;

interface ClockPanelProps {
  isCurrentlyWorking: boolean;
  isOnBreak: boolean;
  canStartNewSession: boolean;
  isLoading: boolean;
  loadingAction: LoadingAction;
  onClockIn: () => void;
  onClockOut: () => void;
  onStartBreak: () => void;
  onEndBreak: () => void;
}

function ClockPanelComponent({
  isCurrentlyWorking,
  isOnBreak,
  canStartNewSession,
  isLoading,
  loadingAction,
  onClockIn,
  onClockOut,
  onStartBreak,
  onEndBreak,
}: ClockPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="w-5 h-5" />
          <span>打刻</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <TimeDisplay />

        {canStartNewSession && (
          <Button
            onClick={onClockIn}
            disabled={isLoading}
            className={`w-full h-12 bg-green-600 hover:bg-green-700 relative overflow-hidden transition-all duration-200 ${
              isLoading && loadingAction === 'clockIn' ? 'animate-pulse shadow-lg' : ''
            }`}
          >
            {isLoading && loadingAction === 'clockIn' ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                出勤中...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                出勤
              </>
            )}
          </Button>
        )}

        {isCurrentlyWorking && (
          <>
            {!isOnBreak ? (
              <Button
                onClick={onStartBreak}
                disabled={isLoading}
                className={`w-full h-12 bg-orange-200 hover:bg-orange-300 text-orange-800 border-orange-300 transition-all duration-200 ${
                  isLoading && loadingAction === 'startBreak' ? 'animate-pulse shadow-lg' : ''
                }`}
              >
                {isLoading && loadingAction === 'startBreak' ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    休憩開始中...
                  </>
                ) : (
                  <>
                    <Coffee className="w-5 h-5 mr-2" />
                    休憩開始
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={onEndBreak}
                disabled={isLoading}
                className={`w-full h-12 bg-orange-200 hover:bg-orange-300 text-orange-800 border-orange-300 transition-all duration-200 ${
                  isLoading && loadingAction === 'endBreak' ? 'animate-pulse shadow-lg' : ''
                }`}
              >
                {isLoading && loadingAction === 'endBreak' ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    休憩終了中...
                  </>
                ) : (
                  <>
                    <Coffee className="w-5 h-5 mr-2" />
                    休憩終了
                  </>
                )}
              </Button>
            )}

            <Button
              onClick={onClockOut}
              disabled={isLoading}
              className={`w-full h-12 bg-red-600 hover:bg-red-700 transition-all duration-200 ${
                isLoading && loadingAction === 'clockOut' ? 'animate-pulse shadow-lg' : ''
              }`}
            >
              {isLoading && loadingAction === 'clockOut' ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  退勤中...
                </>
              ) : (
                <>
                  <LogOut className="w-5 h-5 mr-2" />
                  退勤
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

const ClockPanel = memo(ClockPanelComponent);
export default ClockPanel;
