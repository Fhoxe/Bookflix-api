import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface GoogleBookVolume {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    publishedDate?: string;
    categories?: string[];
    imageLinks?: {
      thumbnail?: string;
    };
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
  };
}

export interface GoogleBooksResponse {
  totalItems: number;
  items?: GoogleBookVolume[];
}

export interface MappedBook {
  googleBooksId: string;
  title: string;
  authors: string;
  description?: string;
  publishedYear?: number;
  genre?: string;
  coverUrl?: string;
  isbn?: string;
}

@Injectable()
export class GoogleBooksService {
  private readonly logger = new Logger(GoogleBooksService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiUrl = this.configService.getOrThrow<string>('GOOGLE_BOOKS_API_URL');
    this.apiKey = this.configService.getOrThrow<string>('GOOGLE_BOOKS_API_KEY');
  }

  async searchBooks(
    query: string,
    maxResults = 10,
    genre?: string,
  ): Promise<MappedBook[]> {
    const fullQuery = genre ? `${query}+subject:${genre}` : query;

    try {
      const response = await firstValueFrom(
        this.httpService.get<GoogleBooksResponse>(`${this.apiUrl}/volumes`, {
          params: {
            q: fullQuery,
            maxResults,
            key: this.apiKey,
          },
        }),
      );

      const items = response.data.items ?? [];
      return items.map((item) => this.mapVolume(item));
    } catch (error) {
      this.logger.error(`Erreur lors de la recherche Google Books : ${error}`);
      return [];
    }
  }

  async searchByGenre(genre: string, maxResults = 40): Promise<MappedBook[]> {
    return this.searchBooks('subject', maxResults, genre);
  }

  private mapVolume(volume: GoogleBookVolume): MappedBook {
    const { volumeInfo } = volume;

    const isbn = volumeInfo.industryIdentifiers?.find(
      (id) => id.type === 'ISBN_13' || id.type === 'ISBN_10',
    )?.identifier;

    const publishedYear = volumeInfo.publishedDate
      ? parseInt(volumeInfo.publishedDate.substring(0, 4), 10)
      : undefined;

    const genre = volumeInfo.categories?.[0];

    return {
      googleBooksId: volume.id,
      title: volumeInfo.title,
      authors: volumeInfo.authors?.join(', ') ?? 'Auteur inconnu',
      description: volumeInfo.description,
      publishedYear: isNaN(publishedYear ?? NaN) ? undefined : publishedYear,
      genre,
      coverUrl: volumeInfo.imageLinks?.thumbnail,
      isbn,
    };
  }
}