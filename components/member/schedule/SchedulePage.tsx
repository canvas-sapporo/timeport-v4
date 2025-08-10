'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Calendar,
  List,
  MapPin,
  Link as LinkIcon,
  Users,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useCompanyFeatures } from '@/hooks/use-company-features';
import { getJSTDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StandardButton } from '@/components/ui/standard-button';
import { Dialog } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ActionButton } from '@/components/ui/action-button';
import { getSchedules, getTodos } from '@/lib/mock';
import type { Schedule, Todo } from '@/schemas/schedule';

const CreateScheduleDialog = dynamic(() => import('./CreateScheduleDialog'), { ssr: false });
const CreateTodoDialog = dynamic(() => import('./CreateTodoDialog'), { ssr: false });

export default function SchedulePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { features, isLoading: featuresLoading } = useCompanyFeatures(user?.company_id);

  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isCreateScheduleOpen, setIsCreateScheduleOpen] = useState(false);
  const [isCreateTodoOpen, setIsCreateTodoOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getJSTDate());

  useEffect(() => {
    async function loadData() {
      if (user) {
        try {
          const [schedulesData, todosData] = await Promise.all([
            getSchedules('user3'),
            getTodos('user3'),
          ]);
          setSchedules(schedulesData);
          setTodos(todosData);
        } catch (error) {
          console.error('Error loading data:', error);
        }
      }
    }
    loadData();
  }, [user]);

  useEffect(() => {
    if (!featuresLoading && features && !features.schedule) {
      router.push('/member/feature-disabled');
      return;
    }
  }, [features, featuresLoading, router]);

  useEffect(() => {
    if (calendarView === 'day') {
      setSelectedDate(getJSTDate());
    }
  }, [calendarView]);

  useEffect(() => {
    if (!user || (user.role !== 'member' && user.role !== 'admin')) {
      router.push('/login');
      return;
    }
  }, [user, router]);

  if (!user || (user.role !== 'member' && user.role !== 'admin')) {
    return null;
  }

  function navigateDate(direction: 'prev' | 'next') {
    const currentDate = new Date(selectedDate);
    let newDate: Date;
    switch (calendarView) {
      case 'day':
        newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate = new Date(currentDate);
        newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'year':
        newDate = new Date(currentDate);
        newDate.setFullYear(currentDate.getFullYear() + (direction === 'next' ? 1 : -1));
        break;
      default:
        newDate = currentDate;
    }
    setSelectedDate(getJSTDate(newDate));
  }

  function goToToday() {
    const today = new Date();
    setSelectedDate(getJSTDate(today));
  }

  function getTodayButtonText() {
    switch (calendarView) {
      case 'day':
        return '今日';
      case 'week':
        return '今週';
      case 'month':
        return '今月';
      case 'year':
        return '今年';
      default:
        return '今日';
    }
  }

  function getDisplayTitle() {
    const date = new Date(selectedDate);
    switch (calendarView) {
      case 'day':
        return date.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        });
      case 'week': {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${weekStart.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })} - ${weekEnd.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}`;
      }
      case 'month':
        return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
      case 'year':
        return `${date.getFullYear()}年`;
      default:
        return date.toLocaleDateString('ja-JP');
    }
  }

  const weekDates = useMemo(() => {
    const date = new Date(selectedDate);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [selectedDate]);

  const monthDates = useMemo(() => {
    const date = new Date(selectedDate);
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return d;
    });
  }, [selectedDate]);

  const selectedDateEvents = schedules.filter(
    (s) =>
      s.start_datetime.startsWith(selectedDate) ||
      (s.is_all_day && s.start_datetime.split('T')[0] === selectedDate)
  );
  const selectedDateTodos = todos.filter((t) => t.due_date === selectedDate);

  function getEventsForDate(date: Date) {
    const dateStr = getJSTDate(date);
    return schedules.filter(
      (s) =>
        s.start_datetime.startsWith(dateStr) ||
        (s.is_all_day && s.start_datetime.split('T')[0] === dateStr)
    );
  }

  function getTodosForDate(date: Date) {
    const dateStr = getJSTDate(date);
    return todos.filter((t) => t.due_date && t.due_date === dateStr);
  }

  function getPriorityBadge(priority: string) {
    const colors: any = {
      low: 'bg-gray-500',
      medium: 'bg-blue-500',
      high: 'bg-orange-500',
      urgent: 'bg-red-500',
    };
    const labels: any = { low: '低', medium: '中', high: '高', urgent: '緊急' };
    return <Badge className={`${colors[priority]} text-white`}>{labels[priority]}</Badge>;
  }

  function getStatusBadge(status: string) {
    const colors: any = {
      pending: 'bg-gray-500',
      in_progress: 'bg-blue-500',
      completed: 'bg-green-500',
      cancelled: 'bg-red-500',
    };
    const labels: any = {
      pending: '未着手',
      in_progress: '進行中',
      completed: '完了',
      cancelled: 'キャンセル',
    };
    return <Badge className={`${colors[status]} text-white`}>{labels[status]}</Badge>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">スケジュール</h1>
          <p className="text-gray-600">スケジュールとTodoを統合管理できます</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              カレンダー
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4 mr-2" />
              リスト
            </Button>
          </div>
          <CreateScheduleDialog
            isOpen={isCreateScheduleOpen}
            onOpenChange={setIsCreateScheduleOpen}
            onCreated={(s) => setSchedules((prev) => [...prev, s])}
          />
          <CreateTodoDialog
            isOpen={isCreateTodoOpen}
            onOpenChange={setIsCreateTodoOpen}
            onCreated={(t) => setTodos((prev) => [...prev, t])}
          />
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span>カレンダー</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                      <Button
                        variant={calendarView === 'day' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setCalendarView('day')}
                      >
                        日
                      </Button>
                      <Button
                        variant={calendarView === 'week' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setCalendarView('week')}
                      >
                        週
                      </Button>
                      <Button
                        variant={calendarView === 'month' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setCalendarView('month')}
                      >
                        月
                      </Button>
                      <Button
                        variant={calendarView === 'year' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setCalendarView('year')}
                      >
                        年
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <StandardButton
                      buttonType="reset"
                      variant="outline"
                      size="sm"
                      onClick={() => navigateDate('prev')}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </StandardButton>
                    <h3 className="text-lg font-medium">{getDisplayTitle()}</h3>
                    <StandardButton
                      buttonType="reset"
                      variant="outline"
                      size="sm"
                      onClick={() => navigateDate('next')}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </StandardButton>
                  </div>
                  <div className="flex items-center space-x-2">
                    {calendarView !== 'day' && (
                      <StandardButton
                        buttonType="reset"
                        variant="outline"
                        size="sm"
                        onClick={goToToday}
                      >
                        {getTodayButtonText()}
                      </StandardButton>
                    )}
                    {calendarView === 'day' && (
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-40"
                      />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {calendarView === 'day' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">スケジュール</h3>
                      {selectedDateEvents.length === 0 ? (
                        <p className="text-gray-500 text-sm">この日にスケジュールはありません</p>
                      ) : (
                        <div className="space-y-2">
                          {selectedDateEvents.map((schedule) => (
                            <div
                              key={schedule.id}
                              className="p-3 rounded-lg border-l-4"
                              style={{
                                backgroundColor: `${schedule.color}15`,
                                borderLeftColor: schedule.color,
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-gray-900">{schedule.title}</div>
                                  <div className="text-sm text-gray-700">
                                    {schedule.is_all_day
                                      ? '終日'
                                      : `${new Date(schedule.start_datetime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} - ${new Date(schedule.end_datetime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`}
                                  </div>
                                  {schedule.location && (
                                    <div className="flex items-center text-sm text-gray-600 mt-1">
                                      <MapPin className="w-3 h-3 mr-1" />
                                      {schedule.location}
                                    </div>
                                  )}
                                  {schedule.url && (
                                    <div className="flex items-center text-sm text-gray-600 mt-1">
                                      <LinkIcon className="w-3 h-3 mr-1" />
                                      <a
                                        href={schedule.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:underline"
                                      >
                                        参加リンク
                                      </a>
                                    </div>
                                  )}
                                  {schedule.description && (
                                    <div className="text-sm text-gray-600 mt-1">
                                      {schedule.description}
                                    </div>
                                  )}
                                </div>
                                <ActionButton action="view" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Todo（期日）</h3>
                      {selectedDateTodos.length === 0 ? (
                        <p className="text-gray-500 text-sm">この日に期日のTodoはありません</p>
                      ) : (
                        <div className="space-y-2">
                          {selectedDateTodos.map((todo) => (
                            <div
                              key={todo.id}
                              className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-yellow-900">{todo.title}</div>
                                  {todo.description && (
                                    <div className="text-sm text-yellow-700 mt-1">
                                      {todo.description}
                                    </div>
                                  )}
                                  <div className="flex items-center space-x-2 mt-1">
                                    {getPriorityBadge(todo.priority)}
                                    {getStatusBadge(todo.status)}
                                    {todo.due_time && (
                                      <div className="flex items-center text-sm text-yellow-700">
                                        <Clock className="w-3 h-3 mr-1" />
                                        {todo.due_time}
                                      </div>
                                    )}
                                    {todo.category && (
                                      <Badge variant="outline" className="text-xs">
                                        {todo.category}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <ActionButton action="view" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {calendarView === 'week' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-7 gap-2">
                      {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
                        <div
                          key={day}
                          className="text-center text-sm font-medium text-gray-600 py-2"
                        >
                          {day}
                        </div>
                      ))}
                      {weekDates.map((date, index) => {
                        const events = getEventsForDate(date);
                        const dayTodos = getTodosForDate(date);
                        const isToday = date.toDateString() === new Date().toDateString();
                        const isSelectedMonth =
                          date.getMonth() === new Date(selectedDate).getMonth();
                        return (
                          <div
                            key={index}
                            className={`min-h-[120px] p-2 border rounded-lg ${isToday ? 'bg-blue-50 border-blue-200' : isSelectedMonth ? 'bg-white' : 'bg-gray-50'}`}
                          >
                            <div
                              className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : date.getDay() === 0 ? 'text-red-500' : date.getDay() === 6 ? 'text-blue-500' : 'text-gray-900'}`}
                            >
                              {date.getDate()}
                            </div>
                            <div className="space-y-1">
                              {events.slice(0, 2).map((event) => (
                                <div
                                  key={event.id}
                                  className="text-xs p-1 rounded"
                                  style={{
                                    backgroundColor: `${event.color}20`,
                                    color: event.color,
                                  }}
                                >
                                  {event.title}
                                </div>
                              ))}
                              {dayTodos.slice(0, 1).map((todo) => (
                                <div
                                  key={todo.id}
                                  className="text-xs p-1 bg-yellow-100 text-yellow-800 rounded"
                                >
                                  {todo.title}
                                </div>
                              ))}
                              {(events.length > 2 || dayTodos.length > 1) && (
                                <div className="text-xs text-gray-500">
                                  +{events.length + dayTodos.length - 3}件
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {calendarView === 'month' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-7 gap-1">
                      {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
                        <div
                          key={day}
                          className="text-center text-sm font-medium text-gray-600 py-2"
                        >
                          {day}
                        </div>
                      ))}
                      {monthDates.map((date, index) => {
                        const events = getEventsForDate(date);
                        const dayTodos = getTodosForDate(date);
                        const isToday = date.toDateString() === new Date().toDateString();
                        const isSelectedMonth =
                          date.getMonth() === new Date(selectedDate).getMonth();
                        return (
                          <div
                            key={index}
                            className={`min-h-[80px] p-1 border rounded ${isToday ? 'bg-blue-50 border-blue-200' : isSelectedMonth ? 'bg-white' : 'bg-gray-50'}`}
                          >
                            <div
                              className={`text-xs font-medium mb-1 ${isToday ? 'text-blue-600' : date.getDay() === 0 ? 'text-red-500' : date.getDay() === 6 ? 'text-blue-500' : 'text-gray-900'}`}
                            >
                              {date.getDate()}
                            </div>
                            <div className="space-y-0.5">
                              {events.slice(0, 1).map((event) => (
                                <div
                                  key={event.id}
                                  className="text-xs p-0.5 rounded truncate"
                                  style={{
                                    backgroundColor: `${event.color}20`,
                                    color: event.color,
                                  }}
                                  title={event.title}
                                >
                                  {event.title}
                                </div>
                              ))}
                              {dayTodos.slice(0, 1).map((todo) => (
                                <div
                                  key={todo.id}
                                  className="text-xs p-0.5 bg-yellow-100 text-yellow-800 rounded truncate"
                                  title={todo.title}
                                >
                                  {todo.title}
                                </div>
                              ))}
                              {(events.length > 1 || dayTodos.length > 1) && (
                                <div className="text-xs text-gray-500">
                                  +{events.length + dayTodos.length - 2}件
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {calendarView === 'year' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      {Array.from({ length: 12 }, (_, monthIndex) => {
                        const monthDate = new Date(
                          new Date(selectedDate).getFullYear(),
                          monthIndex,
                          1
                        );
                        const monthEvents = schedules.filter((s) => {
                          const eventDate = new Date(s.start_datetime);
                          return (
                            eventDate.getFullYear() === monthDate.getFullYear() &&
                            eventDate.getMonth() === monthDate.getMonth()
                          );
                        });
                        const monthTodos = todos.filter((t) => {
                          if (!t.due_date) return false;
                          const todoDate = new Date(t.due_date);
                          return (
                            todoDate.getFullYear() === monthDate.getFullYear() &&
                            todoDate.getMonth() === monthDate.getMonth()
                          );
                        });
                        return (
                          <div key={monthIndex} className="border rounded-lg p-3">
                            <div className="text-sm font-medium text-gray-900 mb-2">
                              {monthDate.toLocaleDateString('ja-JP', { month: 'long' })}
                            </div>
                            <div className="space-y-1">
                              {monthEvents.slice(0, 3).map((event) => (
                                <div
                                  key={event.id}
                                  className="text-xs p-1 rounded"
                                  style={{
                                    backgroundColor: `${event.color}20`,
                                    color: event.color,
                                  }}
                                >
                                  {event.title}
                                </div>
                              ))}
                              {monthTodos.slice(0, 2).map((todo) => (
                                <div
                                  key={todo.id}
                                  className="text-xs p-1 bg-yellow-100 text-yellow-800 rounded"
                                >
                                  {todo.title}
                                </div>
                              ))}
                              {(monthEvents.length > 3 || monthTodos.length > 2) && (
                                <div className="text-xs text-gray-500">
                                  +{monthEvents.length + monthTodos.length - 5}件
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">今日のサマリー</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">スケジュール</span>
                    <span className="text-sm font-medium">{schedules.length}件</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Todo総数</span>
                    <span className="text-sm font-medium">{todos.length}件</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">完了Todo</span>
                    <span className="text-sm font-medium">
                      {todos.filter((t) => t.status === 'completed').length}件
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">進行中Todo</span>
                    <span className="text-sm font-medium">
                      {todos.filter((t) => t.status === 'in_progress').length}件
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">優先度の高いTodo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {todos
                    .filter((t) => t.priority === 'high' || t.priority === 'urgent')
                    .slice(0, 3)
                    .map((todo) => (
                      <div key={todo.id} className="p-2 bg-gray-50 rounded text-sm">
                        <div className="font-medium">{todo.title}</div>
                        <div className="flex items-center space-x-2 mt-1">
                          {getPriorityBadge(todo.priority)}
                          <span className="text-gray-500">{todo.completion_rate}% 完了</span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>スケジュール一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {schedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="p-3 border rounded-lg border-l-4"
                    style={{ borderLeftColor: schedule.color }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{schedule.title}</div>
                        <div className="text-sm text-gray-600">
                          {new Date(schedule.start_datetime).toLocaleDateString('ja-JP')}
                          {!schedule.is_all_day &&
                            ` ${new Date(schedule.start_datetime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`}
                        </div>
                        {schedule.location && (
                          <div className="text-sm text-gray-500 flex items-center mt-1">
                            <MapPin className="w-3 h-3 mr-1" />
                            {schedule.location}
                          </div>
                        )}
                        {schedule.description && (
                          <div className="text-sm text-gray-500 mt-1">{schedule.description}</div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {schedule.recurrence_type !== 'none' && (
                          <Badge variant="outline" className="text-xs">
                            繰り返し
                          </Badge>
                        )}
                        {!schedule.is_private && schedule.shared_with_groups.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Users className="w-3 h-3 mr-1" />
                            共有
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Todo一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todos.map((todo) => (
                  <div key={todo.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{todo.title}</div>
                        {todo.description && (
                          <div className="text-sm text-gray-600 mt-1">{todo.description}</div>
                        )}
                        {todo.due_date && (
                          <div className="text-sm text-gray-600 mt-1">
                            期日: {new Date(todo.due_date).toLocaleDateString('ja-JP')}
                            {todo.due_time && ` ${todo.due_time}`}
                          </div>
                        )}
                        {todo.tags.length > 0 && (
                          <div className="flex items-center space-x-1 mt-2">
                            {todo.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {getPriorityBadge(todo.priority)}
                        {getStatusBadge(todo.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
