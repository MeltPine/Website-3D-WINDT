import { Link } from 'react-router-dom';
import { WERKSTOFF_FAMILY_BY_SLUG, werkstoffPath } from '../../lib/werkstoffe/families';
import {
  COMPARISON_COLUMNS,
  comparisonCell,
  type ComparisonColumn,
  type LibraryProduct,
} from '../../lib/werkstoffe/library';
import { DatasheetLink, DbValue, RetrievedDate } from './DatasheetBits';

const Cell = ({ product, column }: { product: LibraryProduct; column: ComparisonColumn }) => {
  const cell = comparisonCell(product, column);
  if (cell.kind === 'missing') {
    return <span className="text-xs text-gray-500">keine Herstellerangabe</span>;
  }
  if (cell.kind === 'withheld') {
    return (
      <span className="text-xs text-gray-600">
        nicht übernommen –{' '}
        <Link to={`${werkstoffPath(product.familySlug)}#${product.id}`} className="text-primary-700 underline">
          Begründung
        </Link>
      </span>
    );
  }
  return (
    <ul className="space-y-1.5">
      {cell.entries.map(({ value, caption }) => (
        <li key={value.sourceField}>
          <DbValue productId={product.id} value={value} />
          <span className="block text-xs text-gray-500">
            {caption ? `${caption} · ` : ''}
            {value.standard ?? 'Norm nicht angegeben'}
          </span>
        </li>
      ))}
    </ul>
  );
};

interface ComparisonTableProps {
  products: readonly LibraryProduct[];
  caption: string;
  /** Link product names to their family page (overview) or not (detail page). */
  linkFamilies: boolean;
}

const ComparisonTable = ({ products, caption, linkFamilies }: ComparisonTableProps) => (
  <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
    <table className="min-w-full text-left text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead className="bg-gray-50">
        <tr>
          <th scope="col" className="px-4 py-3 font-semibold text-gray-900 min-w-[14rem]">
            Produkt
          </th>
          {COMPARISON_COLUMNS.map((column) => (
            <th key={column.id} scope="col" className="px-4 py-3 font-semibold text-gray-900 min-w-[8rem]">
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {products.map((product) => {
          const family = WERKSTOFF_FAMILY_BY_SLUG[product.familySlug];
          return (
            <tr key={product.id} className="border-t border-gray-200 align-top">
              <th scope="row" className="px-4 py-3 font-normal">
                {linkFamilies ? (
                  <Link
                    to={werkstoffPath(product.familySlug)}
                    className="font-semibold text-primary-700 hover:text-primary-800 underline-offset-2 hover:underline"
                  >
                    {product.name}
                  </Link>
                ) : (
                  <span className="font-semibold text-gray-900">{product.name}</span>
                )}
                <span className="block text-xs text-gray-600">
                  {family?.name ?? product.polymer} · Polymer laut Datenbank: {product.polymer}
                </span>
                <span className="block text-xs text-gray-600">
                  <DatasheetLink product={product} compact /> · <RetrievedDate product={product} />
                </span>
              </th>
              {COMPARISON_COLUMNS.map((column) => (
                <td key={column.id} className="px-4 py-3">
                  <Cell product={product} column={column} />
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export default ComparisonTable;
