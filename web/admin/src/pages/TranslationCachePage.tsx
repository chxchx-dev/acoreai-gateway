import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Languages, Trash2 } from 'lucide-react';
import { translationCacheApi } from '../lib/endpoints';
import { StatCard } from '../components/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/Table';
import { Button } from '../components/Button';

export function TranslationCachePage() {
  const queryClient = useQueryClient();
  const [language, setLanguage] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: languages } = useQuery({
    queryKey: ['translation-cache', 'languages'],
    queryFn: translationCacheApi.languages,
  });

  const { data: stats } = useQuery({
    queryKey: ['translation-cache', 'stats'],
    queryFn: translationCacheApi.stats,
  });

  useEffect(() => {
    if (!language && languages && languages.length > 0) {
      setLanguage(languages[0]);
    }
  }, [language, languages]);

  const { data, isLoading } = useQuery({
    queryKey: ['translation-cache', 'list', { language, search, page }],
    queryFn: () => translationCacheApi.list({ language, search: search || undefined, page, pageSize: 20 }),
    enabled: Boolean(language),
  });

  const removeMutation = useMutation({
    mutationFn: (textHash: string) => translationCacheApi.remove(language, textHash),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['translation-cache'] });
    },
  });

  const totalEntries = stats?.reduce((sum, s) => sum + s.entries, 0) ?? 0;
  const totalHits = stats?.reduce((sum, s) => sum + s.totalHits, 0) ?? 0;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Cache de traducciones</h1>
      <p className="text-sm text-slate-500">
        Traducciones ya generadas por el modelo, guardadas en Mongo (una colección por idioma) y reusadas antes de
        volver a llamar al modelo.
      </p>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Idiomas con cache" value={stats?.length ?? 0} icon={<Languages className="h-4 w-4" />} />
        <StatCard label="Entradas totales" value={totalEntries} />
        <StatCard label="Reusos totales (hits)" value={totalHits} />
        <StatCard
          label={language ? `Entradas — ${language}` : 'Entradas'}
          value={data?.total ?? 0}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-card">
        <select
          value={language}
          onChange={(e) => {
            setLanguage(e.target.value);
            setPage(1);
          }}
          className="input max-w-xs"
        >
          {(languages ?? []).map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar texto original o traducción"
          className="input max-w-sm"
        />
      </div>

      {isLoading && <p className="text-sm text-slate-500">Cargando...</p>}

      {data && (
        <>
          <Table>
            <Thead>
              <tr>
                <Th>Texto original</Th>
                <Th>Traducción</Th>
                <Th>Modelo</Th>
                <Th>Reusos</Th>
                <Th>Actualizado</Th>
                <Th />
              </tr>
            </Thead>
            <Tbody>
              {data.items.map((entry) => (
                <Tr key={entry.textHash}>
                  <Td className="max-w-xs truncate" title={entry.sourceText}>{entry.sourceText}</Td>
                  <Td className="max-w-xs truncate" title={entry.translation}>{entry.translation}</Td>
                  <Td className="text-slate-500">{entry.model}</Td>
                  <Td>{entry.hits}</Td>
                  <Td className="whitespace-nowrap text-slate-500">{new Date(entry.updatedAt).toLocaleString()}</Td>
                  <Td>
                    <button
                      onClick={() => {
                        if (confirm('¿Eliminar esta traducción del cache?')) removeMutation.mutate(entry.textHash);
                      }}
                      className="flex items-center gap-1 text-xs text-red-600 hover:underline"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </button>
                  </Td>
                </Tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <Td colSpan={6} className="py-6 text-center text-slate-400">
                    Sin resultados.
                  </Td>
                </tr>
              )}
            </Tbody>
          </Table>

          <div className="flex items-center justify-between px-1 text-xs text-slate-500">
            <span>
              Página {data.page} — {data.total} registros
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} icon={<ChevronLeft className="h-3.5 w-3.5" />}>
                Anterior
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page * data.pageSize >= data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
