import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SearchBooksInput } from './dto/search-books.input.js';

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
    input: SearchBooksInput,
    maxResults = 10,
    genre?: string,
  ): Promise<MappedBook[]> {
    const query = this.buildGoogleQuery(input, genre);

    if (!query) {
      this.logger.warn('Aucun critère de recherche fourni');
      return [];
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get<GoogleBooksResponse>(`${this.apiUrl}/volumes`, {
          params: {
            q: query,
            maxResults,
            key: this.apiKey,
          },
        }),
      );

      const items = response.data.items ?? [];
      return items.map((item) => this.mapVolume(item, genre));
    } catch (error) {
      this.logger.error(`Erreur lors de la recherche Google Books : ${error}`);
      return [];
    }
  }

  async searchByGenre(genre: string, maxResults = 40): Promise<MappedBook[]> {
    return this.searchBooks({ genre }, maxResults, genre);
  }

  private buildGoogleQuery(input: SearchBooksInput, genre?: string): string {
    const parts: string[] = [];

    if (input.query) {
      parts.push(input.query);
    }

    if (input.title) {
      parts.push(`intitle:${input.title}`);
    }

    if (input.author) {
      parts.push(`inauthor:${input.author}`);
    }

    if (input.genre ?? genre) {
      parts.push(`subject:${input.genre ?? genre}`);
    }

    return parts.join('+');
  }

  private mapVolume(volume: GoogleBookVolume, genre?: string): MappedBook {
    const { volumeInfo } = volume;

    const isbn = volumeInfo.industryIdentifiers?.find(
      (id) => id.type === 'ISBN_13' || id.type === 'ISBN_10',
    )?.identifier;

    const publishedYear = volumeInfo.publishedDate
      ? parseInt(volumeInfo.publishedDate.substring(0, 4), 10)
      : undefined;

    const bookGenre = genre ?? volumeInfo.categories?.[0];

    return {
      googleBooksId: volume.id,
      title: volumeInfo.title,
      authors: volumeInfo.authors?.join(', ') ?? 'Auteur inconnu',
      description: volumeInfo.description,
      publishedYear: isNaN(publishedYear ?? NaN) ? undefined : publishedYear,
      genre: bookGenre,
      coverUrl: volumeInfo.imageLinks?.thumbnail,
      isbn,
    };
  }
}