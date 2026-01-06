'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, Settings, History } from 'lucide-react'
import { ConfigOptionFormDialog } from '@/features/config/components/config-option-form-dialog'
import { ConfigSettingFormDialog } from '@/features/config/components/config-setting-form-dialog'
import { ConfigAuditLog } from '@/features/config/components/config-audit-log'
import { useConfigOptions, useConfigSettings, useConfigAuditLog } from '@/features/config/hooks/use-config'
import { useConfigStore } from '@/features/config/stores/config-store'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import type { ConfigOption, ConfigSetting } from '@/features/config/types'

export default function ConfigPage() {
  const { activeTab, setActiveTab, selectedCategoryId, setSelectedCategoryId } = useConfigStore()
  
  const [selectedOption, setSelectedOption] = useState<ConfigOption | null>(null)
  const [isOptionDialogOpen, setIsOptionDialogOpen] = useState(false)
  const [selectedSetting, setSelectedSetting] = useState<ConfigSetting | null>(null)
  const [isSettingDialogOpen, setIsSettingDialogOpen] = useState(false)
  
  const { data: categories, isLoading: categoriesLoading } = useConfigCategories()
  const { data: options, isLoading: optionsLoading } = useConfigOptions(
    selectedCategoryId || undefined,
    undefined,
    undefined,
    true
  )
  const { data: settings, isLoading: settingsLoading } = useConfigSettings()
  const { data: auditLog, isLoading: auditLogLoading } = useConfigAuditLog()

  const isLoading = categoriesLoading || optionsLoading || settingsLoading || auditLogLoading

  const handleEditOption = (option: ConfigOption) => {
    setSelectedOption(option)
    setIsOptionDialogOpen(true)
  }

  const handleEditSetting = (setting: ConfigSetting) => {
    setSelectedSetting(setting)
    setIsSettingDialogOpen(true)
  }

  const handleCloseOptionDialog = () => {
    setIsOptionDialogOpen(false)
    setSelectedOption(null)
  }

  const handleCloseSettingDialog = () => {
    setIsSettingDialogOpen(false)
    setSelectedSetting(null)
  }

  const handleDeleteOption = (option: ConfigOption) => {
    if (option.isSystem) {
      alert('Cannot delete system options')
      return
    }

    if (confirm(`Are you sure you want to delete option "${option.label}"?`)) {
      // Delete logic would go here
      alert('Delete functionality would be implemented here')
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Configuration Management</h1>
        <p className="text-muted-foreground">
          Manage configuration options, settings, and view audit logs.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="options">Config Options</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* Config Options Tab */}
        <TabsContent value="options">
          <div className="space-y-4">
            {/* Category Selector */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategoryId === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategoryId(null)}
              >
                All Categories
              </Button>
              {categories?.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategoryId === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategoryId(category.id)}
                >
                  {category.name}
                </Button>
              ))}
            </div>

            {/* Options List */}
            {optionsLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <LoadingSpinner className="size-8" />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-3 text-left text-sm font-medium">Code</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Label</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Value</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Badges</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {options?.map((option) => (
                          <tr
                            key={option.id}
                            className="border-b transition-colors hover:bg-muted/50"
                          >
                            <td className="px-4 py-3 text-sm font-mono">
                              {option.code}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">
                              {option.label}
                            </td>
                            <td className="px-4 py-3 text-sm font-mono">
                              {option.value || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex flex-wrap gap-1">
                                {option.isSystem && (
                                  <Badge variant="secondary">System</Badge>
                                )}
                                {option.isDefault && (
                                  <Badge variant="outline">Default</Badge>
                                )}
                                {!option.isActive && (
                                  <Badge variant="secondary">Inactive</Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={option.isActive ? 'default' : 'secondary'}>
                                {option.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditOption(option)}
                                  title="Edit option"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteOption(option)}
                                  title="Delete option"
                                  disabled={option.isSystem}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          {settingsLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <LoadingSpinner className="size-8" />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left text-sm font-medium">Key</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Value Type</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Public</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Value Preview</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settings?.map((setting) => (
                        <tr
                          key={setting.key}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <td className="px-4 py-3 text-sm font-mono">
                            {setting.key}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Badge variant="outline">{setting.valueType}</Badge>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {setting.isPublic && (
                              <Badge variant="default">Yes</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {setting.description || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm font-mono">
                            {typeof setting.value === 'object' 
                              ? JSON.stringify(setting.value, null, 2)
                              : String(setting.value).substring(0, 50)}
                            {typeof setting.value === 'object' && String(setting.value).length > 50 && '...'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditSetting(setting)}
                                title="Edit setting"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit">
          <ConfigAuditLog
            auditLog={auditLog}
            isLoading={auditLogLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ConfigOptionFormDialog
        option={selectedOption}
        open={isOptionDialogOpen}
        onOpenChange={handleCloseOptionDialog}
      />

      <ConfigSettingFormDialog
        setting={selectedSetting}
        open={isSettingDialogOpen}
        onOpenChange={handleCloseSettingDialog}
      />
    </div>
  )
}
