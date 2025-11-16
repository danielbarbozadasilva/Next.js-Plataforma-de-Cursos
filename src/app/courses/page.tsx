"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Course {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  price: number;
  level: string;
  instructor: {
    id: string;
    name: string;
    image: string | null;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
  studentsCount: number;
  reviewsCount: number;
  rating: number;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    categoryId: "",
    level: "",
    minPrice: "",
    maxPrice: "",
    minRating: "",
    sort: "popular",
  });

  useEffect(() => {
    fetchCourses();
  }, [filters, search]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        ...filters,
      });

      const res = await fetch(`/api/student/courses?${params}`);
      const data = await res.json();

      if (res.ok) {
        setCourses(data.courses);
      }
    } catch (error) {
      console.error("Erro ao buscar cursos:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header com busca */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Descubra novos cursos
          </h1>
          <div className="mt-4">
            <input
              type="text"
              placeholder="Buscar cursos..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filtros laterais */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Nível</h3>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={filters.level}
                  onChange={(e) =>
                    setFilters({ ...filters, level: e.target.value })
                  }
                >
                  <option value="">Todos os níveis</option>
                  <option value="BEGINNER">Iniciante</option>
                  <option value="INTERMEDIATE">Intermediário</option>
                  <option value="ADVANCED">Avançado</option>
                </select>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Preço</h3>
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="Mínimo"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={filters.minPrice}
                    onChange={(e) =>
                      setFilters({ ...filters, minPrice: e.target.value })
                    }
                  />
                  <input
                    type="number"
                    placeholder="Máximo"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={filters.maxPrice}
                    onChange={(e) =>
                      setFilters({ ...filters, maxPrice: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Avaliação mínima</h3>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={filters.minRating}
                  onChange={(e) =>
                    setFilters({ ...filters, minRating: e.target.value })
                  }
                >
                  <option value="">Qualquer avaliação</option>
                  <option value="4">4+ estrelas</option>
                  <option value="3">3+ estrelas</option>
                </select>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Ordenar por</h3>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={filters.sort}
                  onChange={(e) =>
                    setFilters({ ...filters, sort: e.target.value })
                  }
                >
                  <option value="popular">Mais populares</option>
                  <option value="newest">Mais recentes</option>
                  <option value="price-asc">Menor preço</option>
                  <option value="price-desc">Maior preço</option>
                  <option value="rating">Melhor avaliados</option>
                </select>
              </div>
            </div>
          </div>

          {/* Lista de cursos */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Carregando cursos...</p>
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Nenhum curso encontrado</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/courses/${course.id}`}
                    className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
                  >
                    <div className="aspect-video bg-gray-200">
                      {course.imageUrl && (
                        <img
                          src={course.imageUrl}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-1 line-clamp-2">
                        {course.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {course.instructor.name}
                      </p>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center">
                          <span className="text-yellow-500 mr-1">★</span>
                          <span className="text-sm font-semibold">
                            {course.rating.toFixed(1)}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          ({course.reviewsCount})
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-blue-600">
                          R$ {Number(course.price).toFixed(2)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {course.studentsCount} alunos
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
