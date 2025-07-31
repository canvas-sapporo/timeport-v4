'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Edit, Loader2, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { updateUser } from '@/lib/actions/admin/users';
import { getEmploymentTypes } from '@/lib/actions/admin/employment-types';
import { getWorkTypes } from '@/lib/actions/admin/work-types';
import type { UserProfile } from '@/schemas/user_profile';
import type { Group } from '@/schemas/group';
import type { EmploymentType, WorkType } from '@/schemas/employment-type';
import type { UUID } from '@/types/common';

// バリデーションスキーマ
const updateUserSchema = z.object({
  code: z.string().min(1, '個人コードは必須です'),
  family_name: z.string().min(1, '姓は必須です'),
  first_name: z.string().min(1, '名は必須です'),
  family_name_kana: z.string().min(1, '姓（カナ）は必須です'),
  first_name_kana: z.string().min(1, '名（カナ）は必須です'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'member']),
  employment_type_id: z
    .string()
    .min(1, '雇用形態は必須です')
    .optional()
    .refine((val) => val && val.length > 0, {
      message: '雇用形態は必須です',
    }),
  current_work_type_id: z
    .string()
    .min(1, '勤務形態は必須です')
    .optional()
    .refine((val) => val && val.length > 0, {
      message: '勤務形態は必須です',
    }),
  group_ids: z.array(z.string()).min(1, '少なくとも1つのグループを選択してください'),
  is_active: z.boolean(),
});

type UpdateUserFormData = z.infer<typeof updateUserSchema>;

interface UserEditDialogProps {
  user: UserProfile & { groups: Group[] };
  groups: Group[];
  companyId: UUID;
  onSuccess?: () => void;
}

export default function UserEditDialog({
  user,
  groups,
  companyId,
  onSuccess,
}: UserEditDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentType[]>([]);
  const [isLoadingEmploymentTypes, setIsLoadingEmploymentTypes] = useState(false);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [isLoadingWorkTypes, setIsLoadingWorkTypes] = useState(false);
  const { toast } = useToast();

  const form = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      code: user.code,
      family_name: user.family_name,
      first_name: user.first_name,
      family_name_kana: user.family_name_kana,
      first_name_kana: user.first_name_kana,
      email: user.email,
      phone: user.phone || '',
      role: user.role as 'admin' | 'member',
      employment_type_id: user.employment_type_id || undefined,
      current_work_type_id: user.current_work_type_id || undefined,
      group_ids: user.groups.map((g) => g.id),
      is_active: user.is_active,
    },
  });

  // 雇用形態データを取得
  const fetchEmploymentTypes = async () => {
    setIsLoadingEmploymentTypes(true);
    try {
      // 会社IDを使用して雇用形態を取得
      const result = await getEmploymentTypes(companyId);
      if (result.success) {
        setEmploymentTypes(result.data.employment_types);
      } else {
        console.error('雇用形態取得失敗:', result.error);
        toast({
          title: 'エラー',
          description: '雇用形態の取得に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('雇用形態取得エラー:', error);
      toast({
        title: 'エラー',
        description: '雇用形態の取得に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingEmploymentTypes(false);
    }
  };

  // 勤務形態データを取得
  const fetchWorkTypes = async () => {
    setIsLoadingWorkTypes(true);
    try {
      const result = await getWorkTypes(companyId, { status: 'active' });
      if (result.success) {
        setWorkTypes(result.data.work_types);
      } else {
        console.error('勤務形態取得失敗:', result.error);
        toast({
          title: 'エラー',
          description: '勤務形態の取得に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('勤務形態取得エラー:', error);
      toast({
        title: 'エラー',
        description: '勤務形態の取得に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingWorkTypes(false);
    }
  };

  // ダイアログが開かれたときにデータを取得
  useEffect(() => {
    if (isOpen) {
      fetchEmploymentTypes();
      fetchWorkTypes();
    }
  }, [isOpen]);

  // ユーザーデータが変更されたときにフォームを更新
  useEffect(() => {
    form.reset({
      code: user.code,
      family_name: user.family_name,
      first_name: user.first_name,
      family_name_kana: user.family_name_kana,
      first_name_kana: user.first_name_kana,
      email: user.email,
      phone: user.phone || '',
      role: user.role as 'admin' | 'member',
      employment_type_id: user.employment_type_id || undefined,
      current_work_type_id: user.current_work_type_id || undefined,
      group_ids: user.groups.map((g) => g.id),
      is_active: user.is_active,
    });
  }, [user, form]);

  const onSubmit = async (data: UpdateUserFormData) => {
    setIsLoading(true);
    try {
      console.log('ユーザー更新開始:', { userId: user.id, data });

      const result = await updateUser(user.id, {
        ...data,
        group_ids: data.group_ids as UUID[],
      });

      console.log('ユーザー更新結果:', result);

      if (result.success) {
        toast({
          title: 'ユーザー更新完了',
          description: 'ユーザーが正常に更新されました',
        });

        setIsOpen(false);
        onSuccess?.();
      } else {
        console.error('ユーザー更新失敗:', result.error);
        toast({
          title: 'エラー',
          description: result.error.message || 'ユーザー更新に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('ユーザー更新エラー:', error);
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'ユーザー更新に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dialog-scrollbar">
        <DialogHeader>
          <DialogTitle>ユーザー編集</DialogTitle>
          <DialogDescription>
            ユーザー情報を編集します。必須項目は * で表示されています。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>個人コード *</FormLabel>
                    <FormControl>
                      <Input placeholder="A001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>権限 *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="権限を選択" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="member">メンバー</SelectItem>
                        <SelectItem value="admin">管理者</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="family_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>姓 *</FormLabel>
                    <FormControl>
                      <Input placeholder="山田" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>名 *</FormLabel>
                    <FormControl>
                      <Input placeholder="太郎" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="family_name_kana"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>姓（カナ） *</FormLabel>
                    <FormControl>
                      <Input placeholder="ヤマダ" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="first_name_kana"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>名（カナ） *</FormLabel>
                    <FormControl>
                      <Input placeholder="タロウ" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>メールアドレス *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="yamada@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>電話番号</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="090-1234-5678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="employment_type_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>雇用形態 *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="雇用形態を選択してください" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingEmploymentTypes ? (
                        <SelectItem value="loading" disabled>
                          読み込み中...
                        </SelectItem>
                      ) : employmentTypes.length === 0 ? (
                        <SelectItem value="no-data" disabled>
                          雇用形態がありません
                        </SelectItem>
                      ) : (
                        employmentTypes.map((employmentType) => (
                          <SelectItem key={employmentType.id} value={employmentType.id}>
                            {employmentType.name} ({employmentType.code})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="current_work_type_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>勤務形態 *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="勤務形態を選択してください" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingWorkTypes ? (
                        <SelectItem value="loading" disabled>
                          読み込み中...
                        </SelectItem>
                      ) : workTypes.length === 0 ? (
                        <SelectItem value="no-data" disabled>
                          勤務形態がありません
                        </SelectItem>
                      ) : (
                        workTypes.map((workType) => (
                          <SelectItem key={workType.id} value={workType.id}>
                            {workType.name} ({workType.code})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">アカウント有効</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      このユーザーアカウントを有効にするかどうか
                    </div>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="group_ids"
              render={() => (
                <FormItem>
                  <FormLabel>所属グループ *</FormLabel>
                  <div className="space-y-2">
                    {groups.map((group) => (
                      <FormField
                        key={group.id}
                        control={form.control}
                        name="group_ids"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={group.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(group.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, group.id])
                                      : field.onChange(
                                          field.value?.filter((value) => value !== group.id)
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                <div className="flex items-center space-x-2">
                                  <Users className="w-4 h-4 text-gray-500" />
                                  <Badge variant="outline" className="font-normal">
                                    {group.name}
                                  </Badge>
                                  {group.code && (
                                    <span className="text-xs text-gray-500">({group.code})</span>
                                  )}
                                </div>
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                更新
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
