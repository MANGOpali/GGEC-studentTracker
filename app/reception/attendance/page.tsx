"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AttendanceClient from "@/components/attendance/AttendanceClient";
import AttendanceHistoryClient from "@/components/attendance/AttendanceHistoryClient";

export default function AttendancePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
      </div>
      <Tabs defaultValue="mark">
        <TabsList>
          <TabsTrigger value="mark">Mark Attendance</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="mark" className="mt-4"><AttendanceClient hideTitle /></TabsContent>
        <TabsContent value="history" className="mt-4"><AttendanceHistoryClient /></TabsContent>
      </Tabs>
    </div>
  );
}
