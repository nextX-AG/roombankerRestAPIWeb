import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender
} from '@tanstack/react-table';
import { Table, Form, InputGroup, Button, Pagination } from 'react-bootstrap';
import { Search, ChevronUp, ChevronDown, ArrowLeft, ArrowRight } from 'lucide-react';

/**
 * BasicTable - Wiederverwendbare TanStack Table Komponente
 *
 * @param {Object} props Component props
 * @param {Array} props.data Die anzuzeigenden Daten
 * @param {Array} props.columns Die Spaltendefinitionen
 * @param {boolean} props.isLoading Gibt an, ob die Daten geladen werden
 * @param {string} props.emptyMessage Nachricht, die angezeigt wird, wenn keine Daten vorhanden sind
 * @param {boolean} props.enableGlobalFilter Aktiviert die globale Filterung
 * @param {boolean} props.enablePagination Aktiviert die Paginierung
 * @param {boolean} props.enableSorting Aktiviert die Sortierung
 * @param {string} props.className Zusätzliche CSS-Klassen für die Tabelle
 * @param {Function} props.onRowClick Funktion, die aufgerufen wird, wenn eine Zeile angeklickt wird (row) => void
 * @param {string} props.filterPlaceholder Platzhaltertext für das Suchfeld
 */
const BasicTable = ({
  data = [],
  columns = [],
  isLoading = false,
  emptyMessage = 'Keine Daten vorhanden.',
  enableGlobalFilter = true,
  enablePagination = true,
  enableSorting = true,
  className = '',
  onRowClick = null,
  filterPlaceholder = 'Suchen...'
}) => {
  // State für globalen Filter
  const [globalFilter, setGlobalFilter] = useState('');

  // TanStack Table-Konfiguration
  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter
    },
    onGlobalFilterChange: setGlobalFilter,
    enableSorting,
    enableGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  // Loading-State anzeigen
  if (isLoading) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Lädt...</span>
        </div>
        <p className="mt-2">Daten werden geladen...</p>
      </div>
    );
  }

  // Leere Datenmeldung anzeigen
  if (!isLoading && data.length === 0) {
    return <div className="text-center p-5">{emptyMessage}</div>;
  }

  return (
    <div className="basic-table">
      {/* Suchfeld */}
      {enableGlobalFilter && (
        <div className="mb-3">
          <InputGroup>
            <InputGroup.Text>
              <Search size={16} />
            </InputGroup.Text>
            <Form.Control
              placeholder={filterPlaceholder}
              value={globalFilter || ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </InputGroup>
        </div>
      )}

      {/* Tabelle */}
      <div className="table-responsive">
        <Table hover responsive className={`mb-0 ${className}`}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{
                      cursor: header.column.getCanSort() ? 'pointer' : 'default',
                      position: 'relative'
                    }}
                  >
                    <div className="d-flex align-items-center">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getCanSort() && (
                        <span className="ms-1">
                          {header.column.getIsSorted() === 'asc' ? (
                            <ChevronUp size={14} />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ChevronDown size={14} />
                          ) : (
                            <span className="text-muted opacity-50">
                              <ChevronUp size={14} style={{ opacity: 0.3 }} />
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                style={onRowClick ? { cursor: 'pointer' } : {}}
                className={onRowClick ? 'cursor-pointer' : ''}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Paginierung */}
      {enablePagination && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div>
            <span className="me-2">
              Seite{' '}
              <strong>
                {table.getState().pagination.pageIndex + 1} von{' '}
                {table.getPageCount()}
              </strong>
            </span>
            <span>
              Zeige{' '}
              <strong>
                {table.getRowModel().rows.length} von {data.length}
              </strong>{' '}
              Einträgen
            </span>
          </div>
          <Pagination className="mb-0">
            <Pagination.First
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            />
            <Pagination.Prev
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ArrowLeft size={16} />
            </Pagination.Prev>
            {/* Seitenzahlen */}
            {Array.from(
              { length: Math.min(5, table.getPageCount()) },
              (_, i) => {
                // Berechne die Seitenzahlen, die angezeigt werden sollen
                let pageIndex = i;
                const currentPageIndex = table.getState().pagination.pageIndex;
                const pageCount = table.getPageCount();
                
                if (pageCount <= 5) {
                  // Wenn es 5 oder weniger Seiten gibt, zeige sie normal an
                  pageIndex = i;
                } else if (currentPageIndex < 3) {
                  // Wenn wir auf einer der ersten 3 Seiten sind
                  pageIndex = i;
                } else if (currentPageIndex > pageCount - 3) {
                  // Wenn wir auf einer der letzten 3 Seiten sind
                  pageIndex = pageCount - 5 + i;
                } else {
                  // Sonst zeige die aktuelle Seite in der Mitte an
                  pageIndex = currentPageIndex - 2 + i;
                }
                
                return (
                  <Pagination.Item
                    key={pageIndex}
                    active={pageIndex === currentPageIndex}
                    onClick={() => table.setPageIndex(pageIndex)}
                  >
                    {pageIndex + 1}
                  </Pagination.Item>
                );
              }
            )}
            <Pagination.Next
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ArrowRight size={16} />
            </Pagination.Next>
            <Pagination.Last
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            />
          </Pagination>
          <Form.Select
            style={{ width: 'auto' }}
            value={table.getState().pagination.pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value));
            }}
          >
            {[10, 25, 50, 100].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize} pro Seite
              </option>
            ))}
          </Form.Select>
        </div>
      )}
    </div>
  );
};

export default BasicTable; 