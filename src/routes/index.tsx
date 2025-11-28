import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Folder,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react'
import { z } from 'zod'

import { useObjectAccess } from '../features/explorer/hooks'
import { getObjectAccess, listObjectsPaginated } from '../features/explorer/s3.server'
import type { PaginatedExplorerResponse } from '../features/explorer/types'
import {
  extractName,
  formatDate,
  formatSize,
  shortenKey,
} from '../features/explorer/utils'

const searchSchema = z.object({
  prefix: z.string().optional(),
  foldersPage: z.coerce.number().int().positive().default(1),
  filesPage: z.coerce.number().int().positive().default(1),
  itemsPerPage: z.coerce.number().int().positive().max(50).default(10),
})

export const Route = createFileRoute('/')({ 
  validateSearch: (search) => searchSchema.parse(search),
  loaderDeps: ({ search }) => searchSchema.parse(search),
  loader: async ({ deps }) =>
    listObjectsPaginated({ data: deps }) as Promise<PaginatedExplorerResponse>,
  component: ExplorerPage,
})

function ExplorerPage() {
  const router = useRouter()
  const navigate = useNavigate({ from: '/' })
  const search = Route.useSearch()
  const data = Route.useLoaderData()

  const [selectedKey, setSelectedKey] = useState<string | null>(
    data.objects[0]?.key ?? null,
  )
  const [downloadKey, setDownloadKey] = useState<string | null>(null)

  const accessState = useObjectAccess(selectedKey)

  useEffect(() => {
    if (selectedKey && data.objects.some((object) => object.key === selectedKey)) {
      return
    }
    setSelectedKey(data.objects[0]?.key ?? null)
  }, [data.objects, selectedKey])

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const value = (formData.get('prefix') as string) ?? ''

    navigate({
      search: (prev) => ({
        ...prev,
        prefix: value.trim() || undefined,
        foldersPage: 1,
        filesPage: 1,
      }),
    })
  }

  const handleFolderSelect = (prefix: string) => {
    navigate({ search: (prev) => ({ ...prev, prefix, foldersPage: 1, filesPage: 1 }) })
  }

  const handleBreadcrumbSelect = (prefix?: string) => {
    navigate({ search: (prev) => ({ ...prev, prefix, foldersPage: 1, filesPage: 1 }) })
  }

  const handleFoldersPageChange = (page: number) => {
    navigate({ search: (prev) => ({ ...prev, foldersPage: page }) })
  }

  const handleFilesPageChange = (page: number) => {
    navigate({ search: (prev) => ({ ...prev, filesPage: page }) })
  }

  const handleDownload = async (key: string) => {
    setDownloadKey(key)
    try {
      const { signedUrl } = await getObjectAccess({
        data: { key, disposition: 'attachment' },
      })
      const anchor = document.createElement('a')
      anchor.href = signedUrl
      anchor.download = extractName(key)
      anchor.rel = 'noreferrer'
      anchor.target = '_blank'
      anchor.click()
    } catch (error) {
      console.error('Download failed', error)
      window.alert('Impossible de générer le lien de téléchargement sécurisé.')
    } finally {
      setDownloadKey(null)
    }
  }

  const handleCopyKey = async (key: string) => {
    if (!key || typeof navigator === 'undefined' || !navigator.clipboard) {
      return
    }

    try {
      await navigator.clipboard.writeText(key)
    } catch (error) {
      console.error('Échec de la copie du chemin sélectionné', error)
    }
  }

  const breadcrumbs = useMemo(() => {
    const parts = (search.prefix ?? '').split('/').filter(Boolean)

    return parts.map((part, index) => ({
      label: part,
      prefix: `${parts.slice(0, index + 1).join('/')}/`,
    }))
  }, [search.prefix])

  const currentPathDisplay = search.prefix ? `/${search.prefix}` : 'Racine du bucket'
  const currentPathValue = search.prefix ? `/${search.prefix}` : '/'

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 space-y-10">
      <header className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-cyan-500/10 backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-200/80">
              S3 - Explorer - OVH Object Storage
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white md:text-4xl">
              Explorateur S3 moderne
            </h1>
            <p className="mt-3 max-w-3xl text-base text-slate-200/80">
              Recherchez, prévisualisez et téléchargez les objets du bucket en toute
              sécurité.
            </p>
          </div>
          <button
            onClick={() => router.invalidate()}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-cyan-400/60 hover:text-cyan-100"
          >
            <RefreshCw size={16} /> Rafraîchir
          </button>
        </div>

        <form
          onSubmit={handleSearch}
          className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-inner shadow-black/20 md:flex-row"
        >
          <label className="flex flex-1 items-center gap-3 rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-sm text-slate-200 focus-within:border-cyan-400/60 focus-within:text-white">
            <Search size={18} className="text-cyan-300" aria-hidden />
            <input
              defaultValue={search.prefix ?? ''}
              name="prefix"
              placeholder="Rechercher par chemin (ex: dossiers/factures/2024)"
              className="w-full bg-transparent text-white placeholder:text-slate-400 focus:outline-none"
              aria-label="Rechercher un chemin S3"
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:bg-cyan-400"
          >
            Lancer la recherche
          </button>
        </form>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-3">
          <InfoPill
            title="Chemin courant"
            value={shortenKey(currentPathDisplay)}
            icon={<Folder size={18} />}
            copyValue={currentPathValue}
          />
          <InfoPill
            title="Documents visibles"
            value={`${data.pagination.files.totalItems} éléments`}
            icon={<FileText size={18} />}
          />
          <InfoPill
            title="Dossiers détectés"
            value={`${data.pagination.folders.totalItems} dossiers`}
            icon={<ArrowUpRight size={18} />}
          />
        </div>
        
            <nav className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-200">
              <button
                onClick={() => handleBreadcrumbSelect()}
                className="rounded-full bg-white/5 px-3 py-1.5 font-semibold text-white transition hover:border-cyan-300/60 hover:bg-cyan-500/20"
              >
                Racine
              </button>
              {breadcrumbs.map((segment) => (
                <div key={segment.prefix} className="flex items-center gap-2">
                  <ChevronRight size={14} className="text-slate-400" />
                  <button
                    onClick={() => handleBreadcrumbSelect(segment.prefix)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-semibold text-white transition hover:border-cyan-300/60 hover:bg-cyan-500/20"
                  >
                    {segment.label}
                  </button>
                </div>
              ))}
            </nav>
      </header>

      <section className="grid gap-6 lg:grid-cols-[280px_1fr_360px]">

        <div className="space-y-4">
          <Panel 
            title={`Dossiers (${data.pagination.folders.totalItems})`} 
            description="Navigation rapide par préfixe"
          >
            {data.pagination.folders.totalItems === 0 ? (
              <EmptyState
                title="Aucun dossier à ce niveau"
                description="Affinez la recherche ou ajoutez un préfixe pour naviguer."
              />
            ) : (
              <>
                <div className="space-y-2">
                  {data.folders.map((folder) => (
                    <button
                      key={folder.prefix}
                      onClick={() => handleFolderSelect(folder.prefix)}
                      className="group flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-cyan-300/60 hover:bg-cyan-500/10"
                    >
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-cyan-500/20 p-2 text-cyan-200">
                          <Folder size={18} />
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-white">
                            {folder.name || '—'}
                          </span>
                        </div>
                      </div>
                      <ArrowUpRight
                        size={16}
                        className="text-cyan-200 transition group-hover:translate-x-1 group-hover:-translate-y-1"
                      />
                    </button>
                  ))}
                </div>
                {data.pagination.folders.totalPages > 1 && (
                  <PaginationControls
                    currentPage={data.pagination.folders.currentPage}
                    totalPages={data.pagination.folders.totalPages}
                    onPageChange={handleFoldersPageChange}
                    itemsPerPage={data.pagination.folders.itemsPerPage}
                    totalItems={data.pagination.folders.totalItems}
                  />
                )}
              </>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel
            title={`Fichiers du dossier (${data.pagination.files.totalItems})`}
            description="Sélectionnez un fichier pour afficher ses détails sur la droite"
          >
            {data.pagination.files.totalItems === 0 ? (
              <EmptyState
                title="Aucun objet listé"
                description="Essayez une limite plus large ou un autre préfixe."
              />
            ) : (
              <>
                <div className="space-y-2">
                  {data.objects.map((object) => {
                    const isSelected = object.key === selectedKey

                    return (
                      <button
                        key={object.key}
                        onClick={() => setSelectedKey(object.key)}
                        className={`group w-full rounded-2xl border px-4 py-3 text-left transition hover:border-cyan-300/60 hover:bg-cyan-500/10 ${
                          isSelected
                            ? 'border-cyan-300/60 bg-cyan-500/10'
                            : 'border-white/10 bg-white/5'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="rounded-full bg-white/10 p-2 text-cyan-200">
                              <FileText size={16} />
                            </span>
                            <div className="flex flex-col">
                              <span className="font-semibold text-white" title={object.key}>
                                {extractName(object.key)}
                              </span>
                            </div>
                          </div>

                          <ArrowUpRight
                            size={16}
                            className="text-cyan-200 transition group-hover:translate-x-1 group-hover:-translate-y-1"
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-200">
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-wide text-slate-300">
                            Taille : {formatSize(object.size)}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-wide text-slate-300">
                            Modifié le : {formatDate(object.lastModified)}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
                {data.pagination.files.totalPages > 1 && (
                  <PaginationControls
                    currentPage={data.pagination.files.currentPage}
                    totalPages={data.pagination.files.totalPages}
                    onPageChange={handleFilesPageChange}
                    itemsPerPage={data.pagination.files.itemsPerPage}
                    totalItems={data.pagination.files.totalItems}
                  />
                )}
              </>
            )}
          </Panel>
        </div>

        <aside className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl shadow-cyan-500/10">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-cyan-500/20 p-2 text-cyan-200">
              <FileText size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Détail du fichier</p>
              <p className="text-xs text-slate-300/80">
                URL signée temporaire (5 minutes), métadonnées et actions rapides
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
            {selectedKey ? (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Objet sélectionné
                </p>
                <p className="font-semibold text-white" title={selectedKey}>
                  {extractName(selectedKey)}
                </p>
              </div>
            ) : (
              <p className="text-slate-300">sélectionner un fichier pour avoir le detail</p>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
            {accessState.status === 'idle' && (
              <p className="text-sm text-slate-300">
                Sélectionnez un document pour récupérer l’URL signée et les métadonnées.
              </p>
            )}

            {accessState.status === 'loading' && (
              <div className="flex items-center gap-3 text-sm text-slate-200">
                <Loader2 size={16} className="animate-spin" />
                Génération d’un lien sécurisé…
              </div>
            )}

            {accessState.status === 'error' && (
              <div className="space-y-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-100">
                <p className="font-semibold">Échec de la consultation</p>
                <p>{accessState.message}</p>
              </div>
            )}

            {accessState.status === 'success' && (
              <div className="space-y-4 text-sm text-slate-200">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Métadonnées</p>
                  <div className="grid grid-cols-2 gap-2 text-slate-200/90">
                    <InfoRow label="Type" value={accessState.data.contentType} />
                    <InfoRow
                      label="Taille"
                      value={formatSize(accessState.data.contentLength)}
                    />
                    <InfoRow
                      label="Modifié"
                      value={formatDate(accessState.data.lastModified)}
                    />
                    <InfoRow label="Key" value={extractName(accessState.data.key)} />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <a
                    href={accessState.data.signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:bg-cyan-400"
                  >
                    <ExternalLink size={14} /> Ouvrir dans un nouvel onglet
                  </a>
                  <button
                    onClick={() => handleDownload(accessState.data.key)}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:border-cyan-300/60 hover:text-cyan-100"
                    disabled={downloadKey === accessState.data.key}
                  >
                    {downloadKey === accessState.data.key ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Download size={14} />
                    )}
                    Télécharger le fichier
                  </button>
                  <button
                    onClick={() => handleCopyKey(accessState.data.key)}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:border-cyan-300/60 hover:text-cyan-100"
                  >
                    <Copy size={14} /> Copier full path <br />
                    ({shortenKey(accessState.data.key)})
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </section>
    </main>
  )
}

function Panel({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-black/20">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {description ? (
          <p className="text-sm text-slate-300/80">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function InfoPill({
  title,
  value,
  icon,
  copyValue,
}: {
  title: string
  value: string
  icon: ReactNode
  copyValue?: string
}) {
  const handleCopy = async () => {
    if (!copyValue || typeof navigator === 'undefined' || !navigator.clipboard) {
      return
    }

    try {
      await navigator.clipboard.writeText(copyValue)
    } catch (error) {
      console.error('Échec de la copie du chemin', error)
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-cyan-500/20 p-2 text-cyan-200">{icon}</span>
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide text-slate-400">
            {title}
          </span>
          <span className="text-sm font-semibold text-white">{value}</span>
        </div>
      </div>

      {copyValue ? (
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:border-cyan-300/60 hover:text-white"
          aria-label={`Copier ${title.toLowerCase()}`}
        >
          <Copy size={16} />
        </button>
      ) : null}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-xs">
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="truncate font-semibold text-white" title={value}>
        {value}
      </p>
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-2xl border border-dashed border-white/15 bg-slate-900/40 p-6 text-slate-200">
      <p className="text-base font-semibold text-white">{title}</p>
      <p className="text-sm text-slate-300/80">{description}</p>
    </div>
  )
}

function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  itemsPerPage: number
  totalItems: number
}) {
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const getVisiblePages = () => {
    const pages: (number | string)[] = []
    const delta = 1 // Number of pages to show on each side of current page

    if (totalPages <= 5) {
      // Show all pages if total is 5 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > delta + 2) {
        pages.push('...')
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - delta)
      const end = Math.min(totalPages - 1, currentPage + delta)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - delta - 1) {
        pages.push('...')
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  const visiblePages = getVisiblePages()

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-300">
          Affichage {startItem}-{endItem} sur {totalItems} éléments
        </p>
        <p className="text-xs text-slate-300">
          Page {currentPage} sur {totalPages}
        </p>
      </div>
      
      <div className="flex items-center justify-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white transition hover:border-cyan-300/60 hover:bg-cyan-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Précédent
        </button>
        
        <div className="flex items-center gap-1">
          {visiblePages.map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} className="px-2 text-xs text-slate-400">
                  ...
                </span>
              )
            }
            
            const pageNum = page as number
            const isActive = pageNum === currentPage
            
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[32px] rounded-lg border px-2 py-2 text-xs font-medium transition ${
                  isActive
                    ? 'border-cyan-300/60 bg-cyan-500/20 text-cyan-100'
                    : 'border-white/10 bg-white/5 text-white hover:border-cyan-300/60 hover:bg-cyan-500/10'
                }`}
              >
                {pageNum}
              </button>
            )
          })}
        </div>
        
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white transition hover:border-cyan-300/60 hover:bg-cyan-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Suivant
        </button>
      </div>
    </div>
  )
}
