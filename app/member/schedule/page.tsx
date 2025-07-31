'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  List,
  Plus,
  Clock,
  MapPin,
  Link as LinkIcon,
  Users,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/auth-context';
import { useCompanyFeatures } from '@/hooks/use-company-features';
// import GlobalLoading from '@/components/ui/global-loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { getSchedules, getTodos, createSchedule, createTodo } from '@/lib/mock';
import { Schedule, Todo, CreateScheduleInput, CreateTodoInput } from '@/schemas/schedule';

export default function MemberSchedulePage() {
  // const { user, isLoading } = useAuth();
  const { user } = useAuth();
  const router = useRouter();

  // 機能チェック
  const { features, isLoading: featuresLoading } = useCompanyFeatures(user?.company_id);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isCreateScheduleOpen, setIsCreateScheduleOpen] = useState(false);
  const [isCreateTodoOpen, setIsCreateTodoOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [scheduleForm, setScheduleForm] = useState<CreateScheduleInput>({
    title: '',
    description: '',
    start_datetime: '',
    end_datetime: '',
    location: '',
    url: '',
    is_all_day: false,
    recurrence_type: 'none',
    is_private: false,
    color: '#3B82F6',
  });

  const [todoForm, setTodoForm] = useState<CreateTodoInput>({
    title: '',
    description: '',
    due_date: '',
    due_time: '',
    priority: 'medium',
    category: '',
    tags: [],
    is_private: false,
  });

  useEffect(() => {
    async function loadData() {
      if (user) {
        try {
          const [schedulesData, todosData] = await Promise.all([
            // getSchedules(user.id),
            // getTodos(user.id)
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

  // 機能チェック
  useEffect(() => {
    if (!featuresLoading && features && !features.schedule) {
      router.push('/member/feature-disabled');
      return;
    }
  }, [features, featuresLoading, router]);

  // 日ビューが選択された時に当日の日付にリセット
  useEffect(() => {
    if (calendarView === 'day') {
      setSelectedDate(new Date().toISOString().split('T')[0]);
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

  async function handleCreateSchedule() {
    try {
      const result = await createSchedule(scheduleForm);
      if (result.success) {
        setSchedules((prev) => [...prev, result.data]);
        setIsCreateScheduleOpen(false);
        setScheduleForm({
          title: '',
          description: '',
          start_datetime: '',
          end_datetime: '',
          location: '',
          url: '',
          is_all_day: false,
          recurrence_type: 'none',
          is_private: false,
          color: '#3B82F6',
        });
      }
    } catch (error) {
      console.error('Error creating schedule:', error);
    }
  }

  async function handleCreateTodo() {
    try {
      const result = await createTodo(todoForm);
      if (result.success) {
        setTodos((prev) => [...prev, result.data]);
        setIsCreateTodoOpen(false);
        setTodoForm({
          title: '',
          description: '',
          due_date: '',
          due_time: '',
          priority: 'medium',
          category: '',
          tags: [],
          is_private: false,
        });
      }
    } catch (error) {
      console.error('Error creating todo:', error);
    }
  }

  function getPriorityBadge(priority: string) {
    const colors = {
      low: 'bg-gray-500',
      medium: 'bg-blue-500',
      high: 'bg-orange-500',
      urgent: 'bg-red-500',
    };
    const labels = {
      low: '低',
      medium: '中',
      high: '高',
      urgent: '緊急',
    };
    return (
      <Badge className={`${colors[priority as keyof typeof colors]} text-white`}>
        {labels[priority as keyof typeof labels]}
      </Badge>
    );
  }

  function getStatusBadge(status: string) {
    const colors = {
      pending: 'bg-gray-500',
      in_progress: 'bg-blue-500',
      completed: 'bg-green-500',
      cancelled: 'bg-red-500',
    };
    const labels = {
      pending: '未着手',
      in_progress: '進行中',
      completed: '完了',
      cancelled: 'キャンセル',
    };
    return (
      <Badge className={`${colors[status as keyof typeof colors]} text-white`}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  }

  // 日付ナビゲーション関数
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

    setSelectedDate(newDate.toISOString().split('T')[0]);
  }

  // 今日/今週/今月/今年に戻る関数
  function goToToday() {
    const today = new Date();

    switch (calendarView) {
      case 'day':
        setSelectedDate(today.toISOString().split('T')[0]);
        break;
      case 'week': {
        // 今週の開始日（日曜日）を計算
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        setSelectedDate(weekStart.toISOString().split('T')[0]);
        break;
      }
      case 'month': {
        // 今月の現在の日付を設定
        setSelectedDate(today.toISOString().split('T')[0]);
        break;
      }
      case 'year': {
        // 今年の現在の日付を設定
        setSelectedDate(today.toISOString().split('T')[0]);
        break;
      }
    }
  }

  // ボタンテキストを取得
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

  // 表示タイトルを取得
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
        return date.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'long',
        });
      case 'year':
        return `${date.getFullYear()}年`;
      default:
        return date.toLocaleDateString('ja-JP');
    }
  }

  // 週の日付範囲を取得
  function getWeekDates() {
    const date = new Date(selectedDate);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + i);
      weekDates.push(dayDate);
    }
    return weekDates;
  }

  // 月の日付範囲を取得
  function getMonthDates() {
    const date = new Date(selectedDate);
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());

    const dates = [];
    for (let i = 0; i < 42; i++) {
      // 6週間分
      const dayDate = new Date(startDate);
      dayDate.setDate(startDate.getDate() + i);
      dates.push(dayDate);
    }
    return dates;
  }

  // Filter events for selected date
  const selectedDateEvents = schedules.filter(
    (s) =>
      s.start_datetime.startsWith(selectedDate) ||
      (s.is_all_day && s.start_datetime.split('T')[0] === selectedDate)
  );

  const selectedDateTodos = todos.filter((t) => t.due_date === selectedDate);

  // 指定日のイベントを取得
  function getEventsForDate(date: Date) {
    const dateStr = date.toISOString().split('T')[0];
    return schedules.filter(
      (s) =>
        s.start_datetime.startsWith(dateStr) ||
        (s.is_all_day && s.start_datetime.split('T')[0] === dateStr)
    );
  }

  // 指定日のTodoを取得
  function getTodosForDate(date: Date) {
    const dateStr = date.toISOString().split('T')[0];
    return todos.filter((t) => t.due_date && t.due_date === dateStr);
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
          <Dialog open={isCreateScheduleOpen} onOpenChange={setIsCreateScheduleOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                スケジュール追加
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>新規スケジュール作成</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">タイトル</Label>
                  <Input
                    id="title"
                    value={scheduleForm.title}
                    onChange={(e) =>
                      setScheduleForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="スケジュールのタイトル"
                  />
                </div>
                <div>
                  <Label htmlFor="description">説明</Label>
                  <Textarea
                    id="description"
                    value={scheduleForm.description}
                    onChange={(e) =>
                      setScheduleForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="詳細な説明"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_datetime">開始日時</Label>
                    <Input
                      id="start_datetime"
                      type="datetime-local"
                      value={scheduleForm.start_datetime}
                      onChange={(e) =>
                        setScheduleForm((prev) => ({ ...prev, start_datetime: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_datetime">終了日時</Label>
                    <Input
                      id="end_datetime"
                      type="datetime-local"
                      value={scheduleForm.end_datetime}
                      onChange={(e) =>
                        setScheduleForm((prev) => ({ ...prev, end_datetime: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="location">場所</Label>
                    <Input
                      id="location"
                      value={scheduleForm.location}
                      onChange={(e) =>
                        setScheduleForm((prev) => ({ ...prev, location: e.target.value }))
                      }
                      placeholder="会議室A"
                    />
                  </div>
                  <div>
                    <Label htmlFor="url">URL</Label>
                    <Input
                      id="url"
                      value={scheduleForm.url}
                      onChange={(e) =>
                        setScheduleForm((prev) => ({ ...prev, url: e.target.value }))
                      }
                      placeholder="https://zoom.us/j/..."
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={scheduleForm.is_all_day}
                      onCheckedChange={(checked) =>
                        setScheduleForm((prev) => ({ ...prev, is_all_day: checked }))
                      }
                    />
                    <Label>終日</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={scheduleForm.is_private}
                      onCheckedChange={(checked) =>
                        setScheduleForm((prev) => ({ ...prev, is_private: checked }))
                      }
                    />
                    <Label>プライベート</Label>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateScheduleOpen(false)}>
                    キャンセル
                  </Button>
                  <Button onClick={handleCreateSchedule}>作成</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isCreateTodoOpen} onOpenChange={setIsCreateTodoOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Todo追加
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新規Todo作成</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="todo_title">タイトル</Label>
                  <Input
                    id="todo_title"
                    value={todoForm.title}
                    onChange={(e) => setTodoForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Todoのタイトル"
                  />
                </div>
                <div>
                  <Label htmlFor="todo_description">説明</Label>
                  <Textarea
                    id="todo_description"
                    value={todoForm.description}
                    onChange={(e) =>
                      setTodoForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="詳細な説明"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="due_date">期日</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={todoForm.due_date}
                      onChange={(e) =>
                        setTodoForm((prev) => ({ ...prev, due_date: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="due_time">期限時刻</Label>
                    <Input
                      id="due_time"
                      type="time"
                      value={todoForm.due_time}
                      onChange={(e) =>
                        setTodoForm((prev) => ({ ...prev, due_time: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="priority">優先度</Label>
                    <Select
                      value={todoForm.priority}
                      onValueChange={(value) =>
                        setTodoForm((prev) => ({
                          ...prev,
                          priority: value as 'low' | 'medium' | 'high' | 'urgent',
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">低</SelectItem>
                        <SelectItem value="medium">中</SelectItem>
                        <SelectItem value="high">高</SelectItem>
                        <SelectItem value="urgent">緊急</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="category">カテゴリ</Label>
                    <Input
                      id="category"
                      value={todoForm.category}
                      onChange={(e) =>
                        setTodoForm((prev) => ({ ...prev, category: e.target.value }))
                      }
                      placeholder="デザイン、開発など"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={todoForm.is_private}
                    onCheckedChange={(checked) =>
                      setTodoForm((prev) => ({ ...prev, is_private: checked }))
                    }
                  />
                  <Label>プライベート</Label>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateTodoOpen(false)}>
                    キャンセル
                  </Button>
                  <Button onClick={handleCreateTodo}>作成</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar View */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span>カレンダー</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    {/* カレンダー表示切り替え */}
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
                    <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <h3 className="text-lg font-medium">{getDisplayTitle()}</h3>
                    <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center space-x-2">
                    {calendarView !== 'day' && (
                      <Button variant="outline" size="sm" onClick={goToToday}>
                        {getTodayButtonText()}
                      </Button>
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
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
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
                                  {todo.completion_rate > 0 && (
                                    <div className="mt-2">
                                      <div className="flex justify-between text-xs text-yellow-700 mb-1">
                                        <span>進捗</span>
                                        <span>{todo.completion_rate}%</span>
                                      </div>
                                      <div className="w-full bg-yellow-200 rounded-full h-2">
                                        <div
                                          className="bg-yellow-600 h-2 rounded-full"
                                          style={{ width: `${todo.completion_rate}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
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
                      {getWeekDates().map((date, index) => {
                        const events = getEventsForDate(date);
                        const todos = getTodosForDate(date);
                        const isToday = date.toDateString() === new Date().toDateString();
                        const isSelectedMonth =
                          date.getMonth() === new Date(selectedDate).getMonth();

                        return (
                          <div
                            key={index}
                            className={`min-h-[120px] p-2 border rounded-lg ${
                              isToday
                                ? 'bg-blue-50 border-blue-200'
                                : isSelectedMonth
                                  ? 'bg-white'
                                  : 'bg-gray-50'
                            }`}
                          >
                            <div
                              className={`text-sm font-medium mb-1 ${
                                isToday
                                  ? 'text-blue-600'
                                  : date.getDay() === 0
                                    ? 'text-red-500'
                                    : date.getDay() === 6
                                      ? 'text-blue-500'
                                      : 'text-gray-900'
                              }`}
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
                              {todos.slice(0, 1).map((todo) => (
                                <div
                                  key={todo.id}
                                  className="text-xs p-1 bg-yellow-100 text-yellow-800 rounded"
                                >
                                  {todo.title}
                                </div>
                              ))}
                              {(events.length > 2 || todos.length > 1) && (
                                <div className="text-xs text-gray-500">
                                  +{events.length + todos.length - 3}件
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
                      {getMonthDates().map((date, index) => {
                        const events = getEventsForDate(date);
                        const todos = getTodosForDate(date);
                        const isToday = date.toDateString() === new Date().toDateString();
                        const isSelectedMonth =
                          date.getMonth() === new Date(selectedDate).getMonth();

                        return (
                          <div
                            key={index}
                            className={`min-h-[80px] p-1 border rounded ${
                              isToday
                                ? 'bg-blue-50 border-blue-200'
                                : isSelectedMonth
                                  ? 'bg-white'
                                  : 'bg-gray-50'
                            }`}
                          >
                            <div
                              className={`text-xs font-medium mb-1 ${
                                isToday
                                  ? 'text-blue-600'
                                  : date.getDay() === 0
                                    ? 'text-red-500'
                                    : date.getDay() === 6
                                      ? 'text-blue-500'
                                      : 'text-gray-900'
                              }`}
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
                              {todos.slice(0, 1).map((todo) => (
                                <div
                                  key={todo.id}
                                  className="text-xs p-0.5 bg-yellow-100 text-yellow-800 rounded truncate"
                                  title={todo.title}
                                >
                                  {todo.title}
                                </div>
                              ))}
                              {(events.length > 1 || todos.length > 1) && (
                                <div className="text-xs text-gray-500">
                                  +{events.length + todos.length - 2}件
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

          {/* Sidebar */}
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
        /* List View */
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
                    {todo.completion_rate > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>進捗</span>
                          <span>{todo.completion_rate}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${todo.completion_rate}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
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
