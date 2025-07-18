"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useData } from "@/contexts/data-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Building, MapPin, Calendar } from "lucide-react";

export default function MemberProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { users, groups } = useData();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    email: "",
  });

  useEffect(() => {
    if (!user || user.role !== "member") {
      router.push("/login");
      return;
    }
  }, [user, router]);

  if (!user || user.role !== "member") {
    return null;
  }

  const userDetails = users.find((u) => u.id === user.id);
  const userGroup = groups.find((g) => g.id === user.primary_group_id);

  const getGroupPath = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return "";
    return group.name;
  };

  const handleEdit = () => {
    setEditData({
      name: userDetails
        ? `${userDetails.family_name} ${userDetails.first_name}`
        : "",
      email: userDetails?.email || "",
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    // In a real app, this would update the user data
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">プロフィール</h1>
        <p className="text-gray-600">ユーザー情報を確認・編集できます</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>基本情報</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">氏名</Label>
              {isEditing ? (
                <Input
                  id="name"
                  value={editData.name}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              ) : (
                <div className="mt-1 text-sm text-gray-900">
                  {userDetails
                    ? `${userDetails.family_name} ${userDetails.first_name}`
                    : "-"}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="email">メールアドレス</Label>
              {isEditing ? (
                <Input
                  id="email"
                  type="email"
                  value={editData.email}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              ) : (
                <div className="mt-1 text-sm text-gray-900">
                  {userDetails?.email}
                </div>
              )}
            </div>

            <div>
              <Label>社員番号</Label>
              <div className="mt-1 text-sm text-gray-900">
                {userDetails?.code || "-"}
              </div>
            </div>

            <div>
              <Label>入社日</Label>
              <div className="mt-1 text-sm text-gray-900">
                {userDetails?.work_start_date
                  ? new Date(userDetails.work_start_date).toLocaleDateString(
                      "ja-JP",
                    )
                  : "-"}
              </div>
            </div>

            <div className="flex space-x-2">
              {isEditing ? (
                <>
                  <Button onClick={handleSave} size="sm">
                    保存
                  </Button>
                  <Button onClick={handleCancel} variant="outline" size="sm">
                    キャンセル
                  </Button>
                </>
              ) : (
                <Button onClick={handleEdit} size="sm">
                  編集
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="w-5 h-5" />
              <span>グループ情報</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>所属グループ</Label>
              <div className="mt-1 text-sm text-gray-900">
                {getGroupPath(user.primary_group_id || "")}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {userGroup?.description}
              </div>
            </div>

            <div>
              <Label>権限</Label>
              <div className="mt-1 text-sm text-gray-900">メンバー</div>
            </div>

            <div>
              <Label>ステータス</Label>
              <div className="mt-1 text-sm text-gray-900">
                {userDetails?.is_active ? "有効" : "無効"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>勤怠サマリー</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">19</div>
              <div className="text-sm text-blue-600">今月出勤日数</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">152</div>
              <div className="text-sm text-green-600">今月勤務時間</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">8.5</div>
              <div className="text-sm text-yellow-600">今月残業時間</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">3</div>
              <div className="text-sm text-purple-600">今月有給取得</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
