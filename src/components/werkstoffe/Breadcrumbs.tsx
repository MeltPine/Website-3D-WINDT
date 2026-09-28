import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  name: string;
  /** Omitted for the current page. */
  path?: string;
}

const Breadcrumbs = ({ items }: { items: readonly BreadcrumbItem[] }) => (
  <nav aria-label="Brotkrumen-Navigation" className="mb-6 text-sm text-gray-600">
    <ol className="flex flex-wrap items-center gap-1.5">
      {items.map((item, index) => (
        <li key={item.name} className="inline-flex items-center gap-1.5">
          {index > 0 && <span aria-hidden="true">›</span>}
          {item.path ? (
            <Link to={item.path} className="text-primary-700 hover:text-primary-800 underline-offset-2 hover:underline">
              {item.name}
            </Link>
          ) : (
            <span aria-current="page" className="font-medium text-gray-900">
              {item.name}
            </span>
          )}
        </li>
      ))}
    </ol>
  </nav>
);

export default Breadcrumbs;
