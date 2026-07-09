"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import KelasTab from "@/components/sarpras/KelasTab"

export default function SarprasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Sarana & Prasarana</h2>
        <p className="text-muted-foreground">Kelola data sarana dan prasarana sekolah</p>
      </div>

      <Tabs defaultValue="kelas">
        <TabsList>
          <TabsTrigger value="kelas">Kelas</TabsTrigger>
          <TabsTrigger value="sarana">Data Sarana</TabsTrigger>
          <TabsTrigger value="prasarana">Data Prasarana</TabsTrigger>
        </TabsList>
        <TabsContent value="kelas">
          <KelasTab />
        </TabsContent>
        <TabsContent value="sarana">
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <p>Fitur Data Sarana akan tersedia segera</p>
          </div>
        </TabsContent>
        <TabsContent value="prasarana">
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <p>Fitur Data Prasarana akan tersedia segera</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
