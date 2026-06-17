'use client'

import { useMemo } from 'react'
import ReactSelect, {
  type GroupBase,
  type SingleValue,
  type StylesConfig
} from 'react-select'
import { useTheme } from '@/components/theme/theme-provider'

export interface GroupSelectOption {
  id: string
  name: string
  participantCount: number
}

interface GroupSelectItem {
  value: string
  label: string
  name: string
  participantCount: number
}

interface GroupSelectProps {
  id?: string
  groups: GroupSelectOption[]
  value: string
  onChange: (groupId: string) => void
  placeholder?: string
  inputId?: string
}

function buildSelectStyles (): StylesConfig<GroupSelectItem, false, GroupBase<GroupSelectItem>> {
  return {
    control: (base, state) => ({
      ...base,
      minHeight: '40px',
      borderRadius: '0.375rem',
      borderColor: state.isFocused ? 'var(--app-select-focus-border)' : 'var(--app-select-border)',
      backgroundColor: 'var(--app-select-bg)',
      boxShadow: state.isFocused ? '0 0 0 2px var(--app-select-focus)' : 'none',
      '&:hover': {
        borderColor: state.isFocused ? 'var(--app-select-focus-border)' : 'var(--app-select-border)'
      }
    }),
    valueContainer: base => ({
      ...base,
      padding: '2px 8px'
    }),
    input: base => ({
      ...base,
      margin: 0,
      padding: 0,
      color: 'var(--app-text-primary)'
    }),
    placeholder: base => ({
      ...base,
      color: 'var(--app-text-muted)'
    }),
    singleValue: base => ({
      ...base,
      color: 'var(--app-text-primary)'
    }),
    menu: base => ({
      ...base,
      zIndex: 50,
      borderRadius: '0.375rem',
      border: '1px solid var(--app-select-border)',
      backgroundColor: 'var(--app-select-menu-bg)',
      boxShadow: 'var(--app-shadow-modal)',
      overflow: 'hidden'
    }),
    menuList: base => ({
      ...base,
      maxHeight: '280px',
      padding: '4px',
      backgroundColor: 'var(--app-select-menu-bg)'
    }),
    option: (base, state) => ({
      ...base,
      borderRadius: '0.25rem',
      fontSize: '0.875rem',
      backgroundColor: state.isSelected
        ? 'var(--app-primary)'
        : state.isFocused
          ? 'var(--app-select-hover)'
          : 'var(--app-select-menu-bg)',
      color: state.isSelected ? 'var(--app-primary-foreground)' : 'var(--app-text-primary)',
      cursor: 'pointer'
    }),
    indicatorSeparator: () => ({
      display: 'none'
    }),
    dropdownIndicator: base => ({
      ...base,
      color: 'var(--app-text-muted)',
      padding: '0 8px',
      '&:hover': { color: 'var(--app-text-primary)' }
    }),
    clearIndicator: base => ({
      ...base,
      color: 'var(--app-text-muted)',
      '&:hover': { color: 'var(--app-text-primary)' }
    }),
    noOptionsMessage: base => ({
      ...base,
      fontSize: '0.875rem',
      color: 'var(--app-text-muted)'
    })
  }
}

function toSelectOption (group: GroupSelectOption): GroupSelectItem {
  return {
    value: group.id,
    label: `${group.name} (${group.participantCount} participantes)`,
    name: group.name,
    participantCount: group.participantCount
  }
}

export function GroupSelect ({
  id,
  groups,
  value,
  onChange,
  placeholder = 'Digite para buscar ou selecione um grupo',
  inputId
}: GroupSelectProps) {
  const { theme } = useTheme()

  const selectStyles = useMemo(() => buildSelectStyles(), [theme])

  const options = useMemo(
    () => groups.map(toSelectOption).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
    [groups]
  )

  const selected = useMemo(
    () => options.find(option => option.value === value) ?? null,
    [options, value]
  )

  function handleChange (option: SingleValue<GroupSelectItem>) {
    onChange(option?.value ?? '')
  }

  return (
    <div id={id}>
      <ReactSelect<GroupSelectItem, false>
        inputId={inputId}
        instanceId={id ?? inputId ?? 'group-select'}
        options={options}
        value={selected}
        onChange={handleChange}
        placeholder={placeholder}
        isClearable
        isSearchable
        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
        menuPosition="fixed"
        styles={{
          ...selectStyles,
          menuPortal: base => ({ ...base, zIndex: 9999 })
        }}
        noOptionsMessage={() => 'Nenhum grupo encontrado'}
        loadingMessage={() => 'Carregando grupos...'}
        filterOption={(option, inputValue) => {
          const query = inputValue.trim().toLowerCase()
          if (!query) return true

          return option.data.name.toLowerCase().includes(query)
            || option.label.toLowerCase().includes(query)
        }}
        formatOptionLabel={(option, { context }) => {
          if (context === 'value') {
            return option.label
          }

          return (
            <div className="py-0.5">
              <p className="truncate font-medium">{option.name}</p>
              <p className="text-xs opacity-70">
                {option.participantCount} participante{option.participantCount === 1 ? '' : 's'}
              </p>
            </div>
          )
        }}
      />
      <p className="mt-1 text-xs text-text-muted">
        {groups.length} grupo{groups.length === 1 ? '' : 's'} disponíve{groups.length === 1 ? 'l' : 'is'}
      </p>
    </div>
  )
}
